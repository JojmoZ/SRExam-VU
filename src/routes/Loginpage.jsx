import { invoke } from '@tauri-apps/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Component/Navbar';
import { Link as RouterLink } from 'react-router-dom';

const Loginpage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: "", password: "" });
    const [usernameError, setUsernameError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    const [loginerror, setLoginError] = useState(null);
    const [users, setUsers] = useState([]);

    function handleInputChange(event) {
        const { name, value } = event.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    }

    async function login() {
        setUsernameError(null);
        setPasswordError(null);
        setLoginError(null);

        if (!formData.username) {
            setUsernameError("Please enter your username.");
            return;
        }

        if (!formData.password) {
            setPasswordError("Please enter your password.");
            return;
        }

        if (isNumeric(formData.username)) {
            try {
                const role = await invoke("get_role_by_nim", { nim: formData.username.toString() });
                console.log(role);
                
                if (["Assistant", "Subject Development", "Exam Coordinator"].includes(role)) 
                {
                    const checker = await invoke("getpassfromdbnim",{ nim: formData.username.toString() })
                    const initial1 = await invoke("get_initial_from_nim", { nim: formData.username.toString() });
                    console.log(checker.length);
                    console.log(typeof checker);
                    if(checker ==="no")
                    {
                        const password = await invoke("get_pass_by_initial", { initial: initial1 });
                        console.log(password);
                        let  verifyResult = await invoke("verify_password", { password: formData.password, hash: password });
                        if (verifyResult.is_matched === true) 
                        {
                            const go = await invoke("loginstudent", { nim: formData.username.toString() });
                            const godb = await invoke("insert_pass_db",{password:password, nim:formData.username.toString() });
                            console.log("hahahaha");
                            navigate("/home");
                        } else {
                            setLoginError("Wrong password or username");
                        }
                    }
                    else
                    {
                        const verifyResult = await invoke("verify_password", { password: formData.password, hash: checker });
                        if (verifyResult.is_matched === true) {
                            const go = await invoke("loginstudent", { nim: formData.username.toString() });
                            navigate("/home");
                        } else {
                            setLoginError("Wrong password or username");
                        }
                       
                    }
                   
                } else {
                    const checker = await invoke("getpassfromdbnim",{ nim: formData.username.toString() });
                    console.log(checker);
                    console.log(checker.length);
                    console.log(typeof checker);
                    if(checker === "no")
                    {
                        const password = await invoke("get_pass_by_nim", { nim: formData.username.toString() });
                        let  verifyResult = await invoke("verify_password", { password: formData.password, hash: password });
                        if (verifyResult.is_matched === true) {
                            const godb = await invoke("insert_pass_db",{password:password, nim:formData.username.toString() });
                            const go = await invoke("loginstudent", { nim: formData.username.toString() });
                            navigate("/home");
                        } else {
                            setLoginError("Wrong password or username");
                        }
                    }
                    else
                    {
                        const verifyResult = await invoke("verify_password", { password: formData.password, hash: checker });
                        if (verifyResult.is_matched === true) {
                            const go = await invoke("loginstudent", { nim: formData.username.toString() });
                            navigate("/home");
                        } else {
                            setLoginError("Wrong password or username");
                        }
                    }
                }

            } catch (error) {
                console.error("Error fetching password by nim:", error);
            }
        } else {
            try {
                const initial = formData.username.slice(0, 2).toUpperCase() + formData.username.slice(2);
                console.log(initial);
                const nimassis =  await invoke("getnimassis", { initial:initial});
                const checker = await invoke("getpassfromdbnim",{ nim: nimassis});
                if(checker === "no")
                {
                    const password = await invoke("get_pass_by_initial", { initial: initial });
                    console.log(password);
                    const verifyResult = await invoke("verify_password", { password: formData.password, hash: password });
                    if (verifyResult.is_matched === true) {
                    const go = await invoke("loginassistant", { initial: initial });
                    const godb = await invoke("insert_pass_db",{password:password, nim:nimassis });
                    navigate("/home");
                } else {
                    setLoginError("Wrong password or username");
                }
                }
                else
                {
                    const verifyResult = await invoke("verify_password", { password: formData.password, hash: checker });
                    if (verifyResult.is_matched === true) {
                        const go = await invoke("loginassistant", { initial: initial });
                        navigate("/home");
                    } else {
                        setLoginError("Wrong password or username");
                    }
                }
               
            } catch (error) {
                console.error("Error fetching password by initial:", error);
                setLoginError("something wrong happened in the app please contact 24-1");
            }
        }
    }

    function isNumeric(str) {
        if (!str || str.length === 0) {
            return false;
        }
        for (let i = 0; i < str.length; i++) {
            if (isNaN(parseInt(str[i]))) {
                return false;
            }
        }
        return true;
    }

    useEffect(() => {
        async function fetchData() {
            try {
                console.log("test");
                const res = await invoke("get_all_users");
                console.log(res);
                console.log("dsuiakhdas");
                console.log("asd");
                const res2 = await (invoke("get_all_subject"));
                const res3 = await (invoke("get_all_rooms"));
                const res4 = await (invoke("get_all_enrollment"));
                const assistants =  await invoke("getAssistants");
                const res5 = await (invoke("populateshift",{assistants: assistants}));
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center text-white">
                <span className="text-9xl">S</span>
                <span className="text-9xl">R</span>
                <span className="text-9xl">E</span>
                <span className="text-9xl">X</span>
                <span className="text-9xl">A</span>
                <span className="text-9xl">M</span>
            </div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center text-white">
                <span className="text-9xl">S</span>
                <span className="text-9xl">R</span>
                <span className="text-9xl">E</span>
                <span className="text-9xl">X</span>
                <span className="text-9xl">A</span>
                <span className="text-9xl">M</span>
            </div>
            <img src="src/assets/SRexam.jpg" alt="Image above login" className="mb-8 animate-slideLeft " />
            <div className="max-w-md w-full bg-zinc-700 shadow-md rounded px-8 pt-6 pb-8 mb-4 animate-slideRight">
                <div className="text-center text-xl">
                    Login
                </div>
                <div className="mb-4">
                    <label className="block text-white text-sm font-bold mb-2" htmlFor="username">
                        Username
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline text-white"
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                    />
                    {usernameError && <p className="text-red-500 text-xs italic">{usernameError}</p>}
                </div>
                <div className="mb-6">
                    <label className="block text-white text-sm font-bold mb-2" htmlFor="password">
                        Password
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline text-white"
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                    />
                    {passwordError && <p className="text-red-500 text-xs italic">{passwordError}</p>}
                    {loginerror && <p className="text-red-500 text-xs italic">{loginerror}</p>}
                </div>
                <div className="flex items-center justify-center">
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        type="button"
                        onClick={login}
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Loginpage;