import React from 'react'

const MainCharacteristic = ({label,characteristic}:{label:string,characteristic:string}) => {
  return (
    <li className="flex flex-col items-center justify-center  rounded-lg w-[90px] lg:w-[150px] h-[100px] p-1 text-white  bg-primaryColor lg:space-y-1 font-extrabold  text-center">
    <span className="font-extrabold bg-primaryColor w-full text-[11px] lg:text-[13px]">{label}</span> <span className='w-full h-[1px] bg-white'/><span className='bg-primaryColor text-[10px] lg:text-[12px]  w-full'>{characteristic}</span>
  </li>
  )
}

export default MainCharacteristic