import React, { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api';
import PopupModal from "./PopupModal";

const StudentExamScheduler = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [submitEnabled, setSubmitEnabled] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [showPopup, setShowPopup] = useState(false); 
  const [nimValidityList, setNimValidityList] = useState([]); 
  const uniqueEnrollments = Array.from(new Set(enrollments
    .filter((enrollment) => enrollment.subject_code === selectedSubject)
    .map((enrollment) => enrollment.class_code)));
  async function fetchRooms() {
    const rooms = await invoke("getrooms", {});
    setRooms(rooms);
  }

  async function fetchEnrollments() {
    const enrollments = await invoke("getenrollments", {});
    setEnrollments(enrollments);
  }

  async function fetchSubjects() {
    const subjects = await invoke('getsubjects', {});
    setSubjects(subjects);
  }

  useEffect(() => {
    fetchSubjects();
    fetchEnrollments();
    fetchRooms();
  }, []);

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
    setSelectedClasses([]);
    validateSubmission();
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    validateSubmission();
  };

  const handleClassSelect = (classCode) => {
    setSelectedClasses((prevSelectedClasses) => {
      if (prevSelectedClasses.includes(classCode)) {
        return prevSelectedClasses.filter((code) => code !== classCode);
      } else {
        return [...prevSelectedClasses, classCode];
      }
    });
    validateSubmission();
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    validateSubmission();
  };

  const handleTimeChange = (e) => {
    setSelectedTime(e.target.value);
    validateSubmission();
  };

  const handleRoomChange = (e) => {
    setSelectedRoom(e.target.value);
    validateSubmission();
    setRoomError('');
  };

  const validateroom = async () => {
    try {
      console.log(typeof selectedRoom)
      const available = await invoke("validate_room", {room:selectedRoom});
      console.log(available);
      if (!available) {
        setRoomError('The selected room is already booked.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const isFutureDate = (date) => {
    const currentDate = new Date();
    const selectedDate = new Date(date);
    return selectedDate > currentDate;
  };

  const validateSubmission = () => {
    if (
      selectedSubject !== '' &&
      selectedClasses.length > 0 &&
      selectedDate !== '' &&
      selectedTime !== '' &&
      selectedRoom !== '' &&
      isFutureDate(selectedDate)
    ) {
      setSubmitEnabled(true);
    } else {
      setSubmitEnabled(false);
    }
  };
  const stoppop = () =>{
    setShowPopup(false);
  }
  const handleCancel = () => {
    setShowPopup(false); 
  };
  const handlepopalgo = async () => {
    const data = {
      selectedSubject,
      selectedClasses,
      selectedDate,
      selectedTime,
      selectedRoom
    };
  
    try {
      const nimValidityList = await invoke("apply_algo", { data });
      setShowPopup(true);
      setNimValidityList(nimValidityList); 
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <div>
      <h2>Exam Scheduler for Students</h2>
      <div>
        <label>Search for Subject:</label>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for a subject..."
          className="bg-slate-500 text-white py-2 px-4 rounded"
        />
      </div>
      <div>
        <label>Select Subject:</label>
        <select
          value={selectedSubject}
          onChange={handleSubjectChange}
          className="bg-slate-500 text-white py-2 px-4 rounded mt-2"
        >
          <option value="">Select a Subject</option>
          {subjects.map((subject) => (
            <option key={subject.subject_code} value={subject.subject_code}>
              {subject.subject_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Select Classes:</label>
        <div className="mt-2 grid grid-cols-6 gap-4">
        {uniqueEnrollments.map((classCode) => {
  const enrollment = enrollments.find((enrollment) => enrollment.class_code === classCode);
  return (
    <label key={classCode} className="block">
      <input
        type="checkbox"
        value={classCode}
        checked={selectedClasses.includes(classCode)}
        onChange={() => handleClassSelect(classCode)}
        className="mr-2"
      />
      {classCode}
    </label>
  );
})}
        </div>
      </div>
      <div>
        <label>Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="bg-slate-500 text-white py-2 px-4 rounded mt-2"
        />
      </div>
      <div>
        <label>Select Time:</label>
        <select
          value={selectedTime}
          onChange={handleTimeChange}
          className="bg-slate-500 text-white py-2 px-4 rounded mt-2"
        >
          <option value="">Select a Time</option>
          <option value="07:20">7:20 AM</option>
          <option value="09:20">9:20 AM</option>
          <option value="11:20">11:20 AM</option>
          <option value="13:20">1:20 PM</option>
          <option value="15:20">3:20 PM</option>
          <option value="17:20">5:20 PM</option>
        </select>
      </div>
      <div>
        <label>Select Room:</label>
        <select
          value={selectedRoom}
          onChange={handleRoomChange}
          onBlur={validateroom} 
          className="bg-slate-500 text-white py-2 px-4 rounded mt-2"
        >
          <option value="">Select a Room</option>
          {rooms.map((room) => (
            <option key={room.room_id} value={room.room_number}>
              {room.room_number}
            </option>
          ))}
        </select>
        {roomError && <div className="text-red-500">{roomError}</div>} 
      </div>
      {selectedDate && !isFutureDate(selectedDate) && (
        <div className="text-red-500">Selected date must be in the future.</div>
      )}
      {submitEnabled && (
        <button onClick={handlepopalgo} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">
          Submit
        </button>
      )}
      {showPopup && (
  <PopupModal
    nimValidityList={nimValidityList} 
    handleCancel={handleCancel}
    subjects= {selectedSubject}
    classes = {selectedClasses}
    date = {selectedDate}
    time = {selectedTime}
    room = {selectedRoom}
    stoppop = {stoppop}
  />
)}
    </div>
  );
};

export default StudentExamScheduler;