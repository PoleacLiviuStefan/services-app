// File: app/api/debug/database/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const isTestingMode = process.env.TESTING_MODE === 'true' || process.env.NODE_ENV === 'development';
    
    if (!isTestingMode) {
      return NextResponse.json(
        { error: 'Debug endpoint available only in testing/development mode' },
        { status: 403 }
      );
    }

    console.log('🔍 Starting database debug investigation...');

    // 1. Check database connection
    let dbConnectionStatus = 'unknown';
    try {
      await prisma.$connect();
      dbConnectionStatus = 'connected';
      console.log('✅ Database connection successful');
    } catch (dbError) {
      dbConnectionStatus = 'failed';
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

    // 2. Get user statistics
    console.log('📊 Gathering user statistics...');
    const userStats = {
      total: 0,
      byRole: {} as Record<string, number>,
      sample: [] as any[]
    };

    try {
      userStats.total = await prisma.user.count();
      console.log(`📈 Total users: ${userStats.total}`);

      if (userStats.total > 0) {
        // Get users grouped by role
        const usersByRole = await prisma.user.groupBy({
          by: ['role'],
          _count: {
            role: true
          }
        });

        usersByRole.forEach(group => {
          userStats.byRole[group.role || 'null'] = group._count.role;
        });

        // Get sample users
        userStats.sample = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        });

        console.log('📋 Users by role:', userStats.byRole);
        console.log('👥 Sample users:', userStats.sample.length);
      }
    } catch (userError) {
      console.error('❌ Error gathering user stats:', userError);
      userStats = {
        total: -1,
        byRole: { error: 'Failed to fetch' },
        sample: []
      };
    }

    // 3. Get provider statistics
    console.log('👨‍⚕️ Gathering provider statistics...');
    const providerStats = {
      total: 0,
      withMainSpeciality: 0,
      sample: [] as any[]
    };

    try {
      providerStats.total = await prisma.provider.count();
      
      providerStats.withMainSpeciality = await prisma.provider.count({
        where: {
          mainSpecialityId: {
            not: null
          }
        }
      });

      if (providerStats.total > 0) {
        providerStats.sample = await prisma.provider.findMany({
          select: {
            id: true,
            userId: true,
            mainSpecialityId: true,
            user: {
              select: {
                name: true,
                email: true,
                role: true
              }
            },
            mainSpeciality: {
              select: {
                name: true,
                price: true
              }
            }
          },
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        });
      }

      console.log(`👨‍⚕️ Total providers: ${providerStats.total}`);
      console.log(`🎯 Providers with main speciality: ${providerStats.withMainSpeciality}`);
    } catch (providerError) {
      console.error('❌ Error gathering provider stats:', providerError);
      providerStats.total = -1;
    }

    // 4. Get speciality statistics
    console.log('🎯 Gathering speciality statistics...');
    const specialityStats = {
      total: 0,
      sample: [] as any[]
    };

    try {
      specialityStats.total = await prisma.speciality.count();

      if (specialityStats.total > 0) {
        specialityStats.sample = await prisma.speciality.findMany({
          select: {
            id: true,
            name: true,
            price: true,
            description: true
          },
          take: 5,
          orderBy: {
            name: 'asc'
          }
        });
      }

      console.log(`🎯 Total specialities: ${specialityStats.total}`);
    } catch (specialityError) {
      console.error('❌ Error gathering speciality stats:', specialityError);
      specialityStats.total = -1;
    }

    // 5. Get session statistics
    console.log('📅 Gathering session statistics...');
    const sessionStats = {
      total: 0,
      byStatus: {} as Record<string, number>,
      recent: [] as any[]
    };

    try {
      sessionStats.total = await prisma.consultingSession.count();

      if (sessionStats.total > 0) {
        // Sessions by status
        const sessionsByStatus = await prisma.consultingSession.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        });

        sessionsByStatus.forEach(group => {
          sessionStats.byStatus[group.status] = group._count.status;
        });

        // Recent sessions
        sessionStats.recent = await prisma.consultingSession.findMany({
          select: {
            id: true,
            status: true,
            startDate: true,
            dailyRoomUrl: true,
            provider: {
              select: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            client: {
              select: { name: true, email: true }
            }
          },
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        });
      }

      console.log(`📅 Total sessions: ${sessionStats.total}`);
      console.log('📊 Sessions by status:', sessionStats.byStatus);
    } catch (sessionError) {
      console.error('❌ Error gathering session stats:', sessionError);
      sessionStats.total = -1;
    }

    // 6. Environment check
    const envCheck = {
      TESTING_MODE: process.env.TESTING_MODE || 'undefined',
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      DATABASE_URL: process.env.DATABASE_URL ? 'defined' : 'undefined',
      DAILY_API_KEY: process.env.DAILY_API_KEY ? 'defined' : 'undefined',
      DAILY_DOMAIN: process.env.DAILY_DOMAIN || 'undefined'
    };

    console.log('🔧 Environment variables:', envCheck);

    // 7. Generate recommendations
    const recommendations = [];

    if (userStats.total === 0) {
      recommendations.push('❌ No users found in database. You need to create test users first.');
    } else if (Object.keys(userStats.byRole).length === 0) {
      recommendations.push('⚠️ No user roles found. Check if users have proper roles assigned.');
    } else if (!userStats.byRole.STANDARD && !userStats.byRole.USER && !userStats.byRole.CLIENT) {
      recommendations.push('⚠️ No users with standard client roles found. Create users with role STANDARD, USER, or CLIENT.');
    }

    if (providerStats.total === 0) {
      recommendations.push('❌ No providers found in database. You need to create test providers first.');
    } else if (providerStats.withMainSpeciality === 0) {
      recommendations.push('⚠️ No providers have main specialities assigned. Set mainSpecialityId for providers.');
    }

    if (specialityStats.total === 0) {
      recommendations.push('❌ No specialities found in database. You need to create specialities first.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Database looks good! All required data is present.');
    }

    const debugReport = {
      timestamp: new Date().toISOString(),
      database: {
        connection: dbConnectionStatus,
        url: process.env.DATABASE_URL ? 'configured' : 'missing'
      },
      users: userStats,
      providers: providerStats,
      specialities: specialityStats,
      sessions: sessionStats,
      environment: envCheck,
      recommendations: recommendations
    };

    console.log('✅ Database debug report completed');

    return NextResponse.json({
      success: true,
      report: debugReport
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Database debug failed:', message);
    
    return NextResponse.json({
      error: 'Database debug failed',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}