import React from 'react'

const Modal = ({children,title,closeModal,...props}) => {
  return (
    <div className={`fixed   flex justify-center items-center top-0 left-0 h-screen w-screen bg-black bg-opacity-50 flex items-center justify-center  z-50 ${props}`}>
        
        <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full space-y-4">
            <h3 className='font-extrabold text-xl'>{title}</h3>
            <button className="absolute top-2 right-2 " onClick={closeModal}>X</button>
            {children}
        </div>
    </div>
  )
}

export default Modal