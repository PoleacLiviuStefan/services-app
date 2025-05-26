import React from 'react'
import ShowcaseCategory from './showcaseCategory'

const ShowcaseCategories = () => {
  return (
    <div className="flex">
        <ShowcaseCategory />
        <ShowcaseCategory />
        <ShowcaseCategory />
        <ShowcaseCategory />
        <ShowcaseCategory />
        <div className="lg:w-[400px] lg:h-[400px] rounded-full shadow-lg bg-white" />
    </div>
  )
}

export default ShowcaseCategories