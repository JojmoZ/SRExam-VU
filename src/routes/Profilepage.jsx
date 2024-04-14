import React, { useEffect, useState } from 'react';
import Navbar from '../Component/Navbar'
import { invoke } from '@tauri-apps/api';

const Profilepage = () => {
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confnewPassword, setNewconfPassword] = useState('');
  useEffect(() => {
    invoke('get_current_user').then((test) => {
      if (test !== null) {
        setUser(test);
      }
    });
  }, []);
  
  const showPopupHandler = () => {
    setShowPopup(true);
  };
  
  const closePopupHandler = () => {
    setShowPopup(false);
    setOldPassword('');
    setNewPassword('');
    setNewconfPassword('');
  };
  
  const changePasswordHandler = async () => {
    const checker = await invoke("getpassfromdbnim",{ nim: user.nim});
    const verifyResult = await invoke("verify_password", { password: oldPassword, hash: checker });
    if (verifyResult.is_matched === true) {
      if (!newPassword || !confnewPassword || !oldPassword) {
        alert('all fields must be filled ');
        return;
      }
    
      if (newPassword === oldPassword) {
        alert('New password cannot be the same as the old password.');
        return;
      }
    
      if (newPassword !== confnewPassword) {
        alert('Confirm new password does not match new password.');
        return;
      }
    
      try {
       const newnew = await invoke("hash_password",{password: newPassword});
        const result = await invoke('change_password', {newpass:newnew.hashed_password, nim:user.nim});
        if (result === true) {
          alert('Password updated successfully.');
          closePopupHandler(); 
        } else {
          alert('Failed to update password. Please try again later.');
        }
      } catch (error) {
        console.error('Error updating password:', error);
        alert('Failed to update password. Please try again later.');
      }
    }
    else{
      alert("wrong password")
    }
   
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {user && (<div className="flex-grow flex items-center justify-center">
        <div>
          <div className="rounded-lg shadow-lg p-6 max-w-md w-full bg-cyan-950">
            <h2 className="text-2xl font-bold mb-4 text-center">Profile</h2>
            <div>
              <div className="mb-4">Name: {user.name}</div>
              <div className="mb-4">Role: {user.role}</div>
              <div className="mb-4">Major: {user.major}</div>
              <div className="mb-4">NIM: {user.nim}</div>
              <div className="mb-4">Initial: {user.initial}</div>
              <div className="mb-4">BN Number: {user.bn_number}</div>
            </div>
          </div>
          <div className="flex flex-row-reverse">
            <button onClick={showPopupHandler}>Change Password?</button>
          </div>
          {showPopup && (
            <div className="fixed top-0 left-0 w-full h-full bg-gray-500 bg-opacity-50 flex items-center justify-center">
              <div className="bg-cyan-950 rounded-lg p-6 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-center">Change Password</h2>
                <div className="mb-4">
                  <label htmlFor="oldPassword" className="block">Old Password:</label>
                  <input type="password" id="oldPassword" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label htmlFor="newPassword" className="block">New Password:</label>
                  <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label htmlFor="confnewPassword" className="block">Confirm New Password:</label>
                  <input type="password" id="confnewPassword" value={confnewPassword} onChange={(e) => setNewconfPassword(e.target.value)} />
                </div>
                <div className="flex justify-between">
                  <button onClick={closePopupHandler}>Cancel</button>
                  <button onClick={changePasswordHandler}>Change Password</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>)}
    </div>
  );
};

export default Profilepage;
