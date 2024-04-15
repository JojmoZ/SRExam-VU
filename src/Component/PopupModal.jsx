import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';
const PopupModal = ({ nimValidityList, handleCancel,subjects,classes,date,time,room,stoppop }) => {
    const [validpeople, setValidpeople] = useState([]);
    const [validSubjects, setValidSubjects] = useState([]);
    const [validDate, setValidDate] = useState([]);
    const [validTime, setValidTime] = useState([]);
    const [validRoom,setValidRoom] = useState([]);
    const [errorMessage, setErrorMessage] = useState([]);
    useEffect(() => {
        setValidTime(nimValidityList.time)
    });
    const submittransac = async () => {
        const validNimValidityList = nimValidityList.filter((item) => item.valid);

        if (validNimValidityList.length === 0) {
            setErrorMessage("At least one student must be valid.");
            return; 
        }
    
        const data = {
            subjects,
            classes,
            date,
            time,
            room,
            nimValidityList: validNimValidityList,
        };
    
        try {
            const response = await invoke('submit_transac', { data });
            console.log(response);
            stoppop(); 
        } catch (error) {
            console.error(error);
        }
    };
    
    return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:max-w-sm sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Student Mapping</h3>
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-blue-950">Mapped Students:</h4>
                <ul className="text-sm text-gray-700">
                  {nimValidityList.map((nimValidity, index) => (
                    nimValidity.valid && (
                      <li key={index}>
                        <span className="font-bold">{nimValidity.nim}-{nimValidity.name}-{nimValidity.class}</span> - Seat Number: {nimValidity.seat_number}
                      </li>
                    )
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-blue-950">Not Mapped Students:</h4>
                <ul className="text-sm text-gray-700">
                  {nimValidityList.map((nimValidity, index) => (
                    !nimValidity.valid && (
                      <li key={index}>
                        <span className="font-bold">{nimValidity.nim}-{nimValidity.name}-{nimValidity.class}</span> - {nimValidity.reason}
                      </li>
                    )
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {errorMessage && ( 
                                <p className="text-red-500">{errorMessage}</p>
                            )}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <span className="flex w-full rounded-md shadow-sm sm:ml-3 sm:w-auto">
              <button
                onClick={submittransac}
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 bg-green-600 text-base leading-6 font-medium text-white shadow-sm hover:bg-green-500 focus:outline-none focus:border-green-700 focus:shadow-outline-green transition ease-in-out duration-150 sm:text-sm sm:leading-5"
              >
                Submit
              </button>
            </span>
            
            <span className="mt-3 flex w-full rounded-md shadow-sm sm:mt-0 sm:w-auto">
              <button
                onClick={handleCancel}
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 px-4 py-2 bg-white text-base leading-6 font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue transition ease-in-out duration-150 sm:text-sm sm:leading-5"
              >
                Cancel
              </button>
              
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupModal;