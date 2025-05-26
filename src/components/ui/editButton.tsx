import React from 'react'
import Button from '../atoms/button'
import { FaEdit } from "react-icons/fa";

const EditButton = ({showEditModal}) => {
  return (
    <Button onClick={showEditModal} className='flex bg-buttonPrimaryColor px-4 py-2 gap-2 text-white hover:bg-buttonSecondaryColor'>Editeaza<span><FaEdit/></span></Button>
  )
}

export default EditButton