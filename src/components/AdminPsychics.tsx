'use client'
import React, { useState, useMemo, useEffect } from 'react'
import ProviderCard from './providerCard'
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa'
import { ProviderInterface } from '@/interfaces/ProviderInterface'

interface AdminPsychicsProps {
  physics: (ProviderInterface & {
    provider: string
  })[]
}

const AdminPsychics: React.FC<AdminPsychicsProps> = ({ physics }) => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const itemsPerPage = 12
  console.log("physics: ",physics)
  // Filtrare utilizatori după nume
  const filteredItems = useMemo(
    () => physics.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [physics, searchTerm]
  )

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  // Resetează pagina dacă filtrul schimbă numărul total de pagini
  useEffect(() => {
    if (currentIndex >= totalPages) {
      setCurrentIndex(0)
    }
  }, [totalPages, currentIndex])

  const startIndex = currentIndex * itemsPerPage
  const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage)

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < totalPages - 1 ? prev + 1 : 0))
  }

  return (
    <div className="flex flex-col items-center">
      {/* Câmp de căutare */}
      <div className="w-full flex justify-center mt-4">
        <input
          type="text"
          placeholder="Caută utilizator..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded w-1/2 focus:outline-none focus:ring-2 focus:ring-buttonPrimaryColor"
        />
      </div>

      {/* Grid de card-uri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {currentItems.length > 0 ? (
          currentItems.map((physic) => (
            <ProviderCard
              key={physic.id}
              forAdmin={true}
              name={physic.name}
              image={physic.image}
              role={physic.role}
              email={physic.email}
              isProvider={Boolean(physic.provider)}
              online={physic.provider?.online}
              rating={physic.provider?.rating || 0}
              description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              reviews={Math.floor(Math.random() * 100)}
              speciality="Speciality"
            />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">
            Nu au fost găsiți utilizatori.
          </p>
        )}
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={goToPrevious}
            className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-2xl lg:text-4xl w-10 lg:w-12 h-10 lg:h-12 rounded-full text-white"
          >
            <FaCaretLeft />
          </button>

          <ul className="flex space-x-2">
            {Array.from({ length: totalPages }).map((_, page) => (
              <li
                key={page}
                className={`flex items-center justify-center font-bold text-center w-7 h-7 rounded-full cursor-pointer ${page === currentIndex ? 'bg-gray-600 text-white' : 'bg-gray-400 text-gray-700'}`}
                onClick={() => setCurrentIndex(page)}
              >
                {page + 1}
              </li>
            ))}
          </ul>

          <button
            onClick={goToNext}
            className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-2xl lg:text-4xl w-10 lg:w-12 h-10 lg:h-12 rounded-full text-white"
          >
            <FaCaretRight />
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminPsychics
