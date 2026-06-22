import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const CreatePosts = () => {
    const [dataforpost, setdataforpost] = useState({});
    const [SizeQuantity, setSizeQuantity] = useState([]);
    const [Size, setSize] = useState('');
    const [Quantity, setQuantity] = useState(0);
    const [imageUrl, setImageUrl] = useState('');
    const [file, setFile] = useState(null);
    const formRef = useRef();
    const SQ = useRef();
    const [selectedImage, setSelectedImage] = useState(null);
    const message = useRef();

    const handleFileChange = (e) => {
        setFile(e.target.files[0])
        const file = e.target.files && e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageURL = URL.createObjectURL(file);
            setSelectedImage(imageURL);
        } else {
            console.warn("Invalid file or no file selected");
        }

    }
    const handleRemoveImage = () => {
        setSelectedImage(null);
        // Clear the file input value
        document.getElementById('file-upload').value = '';
    };
    const handleValue = (e) => setdataforpost((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSize = (e) => setSize(e.target.value);
    const handleQuantity = (e) => setQuantity(parseInt(e.target.value));

    const handleSizeQuantity = () => {
        if (!Quantity || !Size) return (SQ.current.innerHTML = 'Both fields are required');
        setSizeQuantity((prev) => [...prev, { [Size]: false, quantity: Quantity }]);
        SQ.current.innerHTML = '';
        setSize('');
        setQuantity(0);
    };

    const handleDeleteSQ = (index) => {
        setSizeQuantity((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append('image', file);
    
        try {
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/images/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
    
            const uploadedUrl = response.data.url;
            setImageUrl(uploadedUrl);
            return uploadedUrl; // 🔁 Important: Return it for use in handlePost
        } catch (error) {
            console.error('Error uploading the image:', error);
            return null; // Indicate failure
        }
    };
    

    const postData = async (data) => {
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/data/add/`, data);
        } catch (error) {
            console.log('Error posting data:', error);
        }
    };

    const handlePost = async () => {
        const postButton = document.querySelector('.post-button');
        postButton.disabled = true;
    
        if (!dataforpost.name || !dataforpost.detail || !dataforpost.category || !dataforpost.price || SizeQuantity.length === 0 || !selectedImage)  {
            message.current.classList.add('text-red-500');
            message.current.innerHTML = 'All fields are required';
            postButton.disabled = false;
            return;
        }
    
        // Await image upload first and ensure imageUrl is updated
        let uploadedImageUrl = imageUrl;
    
        if (file && !imageUrl) {
            try {
                uploadedImageUrl = await handleUpload();
                if (!uploadedImageUrl) {
                    throw new Error("Image upload failed");
                }
            } catch (err) {
                console.error("Upload error:", err);
                message.current.classList.add('text-red-500');
                message.current.innerHTML = 'Failed to upload image';
                postButton.disabled = false;
                return;
            }
        }
    
        const updatedData = {
            ...dataforpost,
            img: uploadedImageUrl,
            sizes: SizeQuantity,
            Incart: false,
            favourite: false,
            total: 1,
            id: uuidv4(),
        };
    
        try {
            await postData(updatedData);
    
            // Reset form and state
            setdataforpost({ name: '', detail: '', category: '', price: 0 });
            setSizeQuantity([]);
            setImageUrl('');
            setFile(null);
            formRef.current.reset();
            toast.success('Posted successfully!');
            handleRemoveImage();
            setSelectedImage(null);
            message.current.classList.remove('text-red-500');
            message.current.innerHTML = 'Posted successfully!';
        } catch (error) {
            console.log('Error posting data:', error);
            message.current.classList.add('text-red-500');
            message.current.innerHTML = 'Error posting data';
        }
    
        postButton.disabled = false;
    };
    

    return (
        <div>
            <form ref={formRef}>
                <div className="bg-base-200 rounded-sm min-h-[61vh] md:px-1">
                    <h1 className="xl:pl-5 text-3xl font-bold py-2">Manage Posts</h1>
                    <div className="flex flex-wrap gap-2">
                        <div className="w-[68%] pl-3 min-h-[50vh] flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <label className="font-bold">Name of the product :</label>
                                <input type="text" name="name" onChange={handleValue} className="input input-bordered w-full max-w-xs" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-bold">Detail :</label>
                                <textarea className="min-h-[33vh] rounded-md min-w-[25vw] outline-none" name="detail" onChange={handleValue}></textarea>
                            </div>
                        </div>
                        <div className="flex justify-center flex-col gap-2 w-[30vw]">
                            <div className="flex gap-2">
                                <div className="flexer gap-2">
                                    <label className="font-bold">Price</label>
                                    <input name="price" onChange={handleValue} type="number" className="input input-bordered w-full max-w-40" />
                                </div>
                                <div className="flexer   gap-2">
                                    <label className="font-bold">Category</label>
                                    <select name="category" onChange={handleValue} className="select select-bordered w-full max-w-xs">
                                        <option disabled selected>Select the Category</option>
                                        <option>Shirt</option>
                                        <option>T_Shirt</option>
                                        <option>Pant</option>
                                        <option>Trouser</option>
                                        <option>Blazer</option>
                                    </select>
                                </div>
                            </div>
                            <div className=' flex items-center gap-2'>
                                <div className="flexer gap-2">
                                    <label className="font-bold">Size :</label>
                                    <input value={Size} onChange={handleSize} type="text" className="input input-bordered w-full max-w-36" />
                                </div>
                                <div className="flexer gap-2">
                                    <label className="font-bold">Quantity :</label>
                                    <input value={Quantity} onChange={handleQuantity} type="number" className="input input-bordered w-full max-w-24" />
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleSizeQuantity} className="btn btn-sm">Add</button>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-red-500 text-xs" ref={SQ}></h1>
                            </div>
                            {SizeQuantity.map((item, index) => {
                                const sizeKey = Object.keys(item).find((key) => key !== 'quantity');
                                return (
                                    <div key={index} className="flex justify-between bg-base-300 py-2 mb-2 rounded-md px-2">
                                        <div className="flex gap-2">
                                            <h1>Size: {sizeKey}</h1>
                                            <h1>Quantity: {item.quantity}</h1>
                                        </div>
                                        <button className="btn btn-xs" onClick={() => handleDeleteSQ(index)}>Delete</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 w-[29vw]">
                        <div className="flex flex-col items-center justify-center p-4">
                            {!selectedImage ? (
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer px-4 py-2 bg-[#3DA0A7] text-white rounded-lg hover:bg-[#2b7d82] transition"
                                >
                                    Choose Image
                                </label>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <img
                                        src={selectedImage}
                                        alt="Selected"
                                        className="w-48 h-48 object-cover rounded-lg mb-2"
                                    />
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleRemoveImage}
                                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                        >
                                            Remove Image
                                        </button>
                                        <label
                                            htmlFor="file-upload"
                                            className="cursor-pointer bg-[#3DA0A7] text-white px-3 py-1 rounded hover:bg-[#2b7d82]"
                                        >
                                            Change Image
                                        </label>
                                    </div>
                                </div>
                            )}

                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        <button type="button" className="btn post-button" onClick={handlePost}>Post</button>
                        <h1 ref={message} className="text-sm"></h1>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreatePosts;
