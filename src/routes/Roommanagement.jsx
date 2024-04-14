import { invoke } from "@tauri-apps/api";
import { useEffect, useState } from "react";
import Navbar from "../Component/Navbar";

const Roommanagement = () => {
  const [roomSchedules, setRoomSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    filterSchedule(selectedDate, '');
  }, [selectedDate]);

  const fetchRooms = async () => {
    try {
      const roomsData = await invoke("getrooms");
      setRooms(roomsData);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchRoomSchedules = async (date) => {
    try {
        const schedules = await invoke("getRoomSched", { date });
        return schedules;
    } catch (error) {
        console.error(`Error fetching schedule for date ${date}:`, error);
        return [];
    }
};

  const filterSchedule = async (date) => {
    const schedules = await fetchRoomSchedules(date);
    setFilteredSchedules(schedules);
};
  const handleRoomSelect = (roomNumber) => {
    setSearchTerm('');
    if (roomNumber === 'all') {
      filterSchedule(selectedDate, '');
    } else {
      filterSchedule(selectedDate, roomNumber);
    }
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
    filterSchedule(event.target.value);
};

const handleSearchChange = async (event) => {
  const searchTerm = event.target.value.toLowerCase();
  setSearchTerm(searchTerm);
  
  if (!searchTerm) {
    filterSchedule(selectedDate);
  } else {
    const searchTermsArray = searchTerm.split(",").map(term => term.trim());
    const fetchPromises = searchTermsArray.map(async searchTerm => {
      const schedules = await fetchRoomSchedules(selectedDate);
      return schedules.filter(schedule =>
        schedule.room_number.toLowerCase().includes(searchTerm)
      );
    });
    const filteredByRoomNumbers = await Promise.all(fetchPromises);
    const filtered = filteredByRoomNumbers.flat();
    setFilteredSchedules(filtered);
  }
};

  return (
    <>
    <Navbar/>
    <div>
      <h2 className="text-xl font-bold mb-4">Room Management</h2>
      <div className="flex mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="bg-slate-500 text-white py-2 px-4 rounded mt-2"
        />
        <input
          type="text"
          placeholder="Search by room number..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="bg-slate-500 text-white py-2 px-4 rounded mt-2"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {filteredSchedules.map((schedule, index) => (
          <div key={index} className="bg-gray-900 p-4 mb-4">
            <h3 className="text-lg font-bold mb-2">{schedule.room_number}</h3>
            <p>Capacity: {schedule.room_capacity}</p>
            <p>Time: {schedule.time}</p>
          </div>
        ))}
      </div>
    </div>
    </>
  );
};

export default Roommanagement;
