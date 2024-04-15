import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api';

const PopUpModal2 = ({ assignedAssistants, stoppop }) => {

  const sendassistschedule = async () => {
    const go = await invoke("sendassistschedule", { assignedAssistants: assignedAssistants });
    if (go === true) {
      stoppop();
    } else {
      alert("Something went wrong please contact 24-1");
    }
  };

  const handleClose = () => {
    stoppop();
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:max-w-sm sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Assistants Assigned</h3>
              <div className="mt-4">
                <ul className="text-sm text-gray-700">
                  {assignedAssistants.map((assignedAssistant, index) => (
                    <li key={index}>{`${assignedAssistant[0].date} - ${assignedAssistant[0].time} - ${assignedAssistant[0].room} - ${assignedAssistant[1].initial}`}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <span className="flex w-full rounded-md shadow-sm sm:ml-3 sm:w-auto">
              <button
                onClick={sendassistschedule}
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 bg-green-600 text-base leading-6 font-medium text-white shadow-sm hover:bg-green-500 focus:outline-none focus:border-green-700 focus:shadow-outline-green transition ease-in-out duration-150 sm:text-sm sm:leading-5"
              >
                Submit
              </button>
            </span>
            <span className="mt-3 flex w-full rounded-md shadow-sm sm:mt-0 sm:w-auto">
              <button
                onClick={handleClose}
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 px-4 py-2 bg-white text-base leading-6 font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue transition ease-in-out duration-150 sm:text-sm sm:leading-5"
              >
                Close
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopUpModal2;
