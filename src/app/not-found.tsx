import Image from 'next/image'
import React from 'react'

export default function NotFound() {
  return (
    <div className="text-[#424BE0] bg-white h-screen flex flex-col items-center justify-center">
      {/* Bigger Image Container */}
      <div className="w-[400px] h-[400px] md:w-[500px] md:h-[500px]">
        <Image
          src="/page-not-found.svg"
          alt="Page Not Found"
          width={500}
          height={500}
          className="object-contain"
          priority
        />
      </div>

      {/* Text Section */}
      <h2 className="text-lg md:text-xl font-semibold text-center px-4">
        Sorry, this page does not seems to exist.
      </h2>
    </div>
  )
}
