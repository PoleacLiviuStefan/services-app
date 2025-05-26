import React from 'react'

const SectionTitle = ({children}:{
  children: React.ReactNode
}) => {
  return (
    <span className='font-bold text-white text-lg lg:text-xl bg-gradient-to-t from-secondaryColor to-primaryColor px-16 py-2 rounded-lg shadow-lg shadow-primaryColor/40 text-center'>{children}</span>
  )
}

export default SectionTitle