import React, { useRef } from 'react'

const AddReview = () => {
    const textAreaForm=useRef<HTMLTextAreaElement>(null)
  return (
    <div className='flex flex-col items-start w-full'>
        <textarea  ref={textAreaForm} />
    </div>  
  )
}

export default AddReview