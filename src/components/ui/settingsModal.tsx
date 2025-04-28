import React from 'react'
import InputForm from './inputForm'
import SelectForm from './selectForm'
import Button from '../atoms/button'

const SettingsModal = ({ setShowSettings }: { setShowSettings: (show: boolean) => void }) => {
  return (
    <div className='relative flex flex-col items-center justify-center w-[90%] p-4 gap-4 lg:w-[400px] h-full lg:h-[500px] bg-white rounded-lg shadow-lg shadow-primaryColor/40'>
      <form className='flex flex-col '>
          <SelectForm defaultValue='SELECTEAZA O SPECIALITATE PRINCIPALA' values={["",""]} />
          <InputForm name="name" placeholder="Specialitate Principala" type="text" />
          <InputForm name="name" placeholder="Unealta Principala" type="text" />
          <InputForm name="name" placeholder="Unealta Principala" type="text" />
          <InputForm name="email" placeholder="Email" type="email" />
      </form> 
      <Button onClick={()=>setShowSettings(false)} className='absolute top-2 right-2'>X</Button>
    </div>
  )
}

export default SettingsModal