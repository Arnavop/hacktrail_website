import React from 'react';

const NavBar: React.FC = () => {
  return (
    <nav className="flex items-center justify-between p-4 bg-[#181818] text-white fixed w-full">
      <div className="text-2xl font-bold">HackTrail</div>
      <div className="flex gap-4">
        <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded">Login</button>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded">Sign Up</button>
      </div>
    </nav>
  );
};

export default NavBar;
