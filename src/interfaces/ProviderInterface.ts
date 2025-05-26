import { UserInterface } from "./UserInterface";
import { Package } from "./PackageInterface";



export interface ReviewType {
  id: string;
  comment?: string;
  date: string;
  rating: number;
  service: "CHAT" | "MEET";
  fromUser: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface SpecialityType {
  id: string
  name: string
  description?: string
}

export interface ToolType {
  id: string
  name: string
  description?: string
}

export interface ReadingType {
  id: string
  name: string
  description?: string
}


export interface ProviderInterface extends Omit<UserInterface, "provider"> {
  provider: {
    id: string
    online: boolean
    description: string
    tools: ToolType[]         // acum e array de obiecte, nu string[]
    specialities: SpecialityType[] // la fel
  }
  description: string
  calendlyCalendarUri?: string | null
  tools: ToolType[]   
  grossVolume?: number | null // câmp nou pentru volumul brut
  // câmp nou pentru reading
  averageRating?: number
  user?:UserInterface
  reading?: ReadingType
  specialities?: SpecialityType[]
  online: boolean
  rating: number
  reviews: number
  speciality: string
  reviewsCount: number
  packages: Package[]
  videoUrl?: string
  title: string
  mainSpeciality: SpecialityType
  moreSpecialties: string[]
  mainTool: ToolType
  moreTools: string[]
  readingStyle: string
  about: string
  scheduleLink: string
}