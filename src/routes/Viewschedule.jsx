import React, { useState } from 'react'
import Navbar from '../Component/Navbar';
import StudentSchedule from '../Component/StudentSchedule';
import AssistantSchedule from '../Component/AssistantSchedule';

const Viewschedule = () => {
  const [allocationType, setAllocationType] = useState('');

  const handleAllocationTypeChange = (type) => {
    setAllocationType(type);
  };

  

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center ">
        <h2 className="text-4xl font-bold mb-8 mt-5">View Schedule</h2>
        <div className="flex mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-l mr-2"
            onClick={() => handleAllocationTypeChange('assistant')}
          >
            Assistant Schedule
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r ml-2"
            onClick={() => handleAllocationTypeChange('student')}
          >
            Student Schedule
          </button>
        </div>
        <div className=''>
        {allocationType === 'student' && <StudentSchedule />}
        {allocationType === 'assistant' && <AssistantSchedule />}
        </div>
       
      </div>
    </>
  );
};

export default Viewschedule