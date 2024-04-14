import React, { useState, useEffect } from 'react';
import Navbar from '../Component/Navbar';
import StudentExamScheduler from '../Component/StudentExamScheduler'; 
import AssistantExamScheduler from '../Component/AssistantExamScheduler';

const Examscheduler = () => {
  const [allocationType, setAllocationType] = useState('');

  const handleAllocationTypeChange = (type) => {
    setAllocationType(type);
  };

  

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center ">
        <h2 className="text-4xl font-bold mb-8 mt-5">Exam Scheduler</h2>
        <div className="flex mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-l mr-2"
            onClick={() => handleAllocationTypeChange('assistant')}
          >
            Allocate for Assistant
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r ml-2"
            onClick={() => handleAllocationTypeChange('student')}
          >
            Allocate for Student
          </button>
        </div>
        <div className=''>
        {allocationType === 'student' && <StudentExamScheduler />}
        {allocationType === 'assistant' && <AssistantExamScheduler />}
        </div>
       
      </div>
    </>
  );
};


export default Examscheduler;
