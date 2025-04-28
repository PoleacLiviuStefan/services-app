import React from 'react'
import AttributeOption from './attributeOption'


interface AddAtributeInterface {
  existingOption: string[]
}

const AddAttribute:React.FC<AddAtributeInterface> = ({existingOption}) => {
  return (
    <div>
        {existingOption.map((option, index) => (
            <AttributeOption key={index} value={option} />
        ))}
    </div>

  )
}

export default AddAttribute