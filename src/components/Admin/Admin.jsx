import React from 'react'
import Navbar from '../Navbar'
import Footer from '../Footer'
import { useState } from 'react'
import Orders from './Orders'
import CreatePosts from './CreatePosts'
import OrdersHistory from './OrdersHistory'
import Messages from './Messages'
import Menu from '../Menu'
import Products from './Products'

const Admin = () => {

    const [selectedItem, setSelectedItem] = useState('orders');

    return (
        <div>
            <Navbar />
            <Menu/>
            <div className='px-2 min-h-[61vh] mt-5 roboto_font'>

                <div className='gap-1 max-md:flex-col min-h-[61vh] flex'>
                    <div className="font-bold rounded-sm md:flex-col w-[13%] max-md:w-full flex gap-1 md:min-h-[61vh]">
                        {/* My Orders Tab */}
                        <div 
                            onClick={() => setSelectedItem("orders")}
                            className={`pr-2 max-md:text-sm rounded-sm bg-base-300 flex pl-5 items-center max-md:px-2 h-16 cursor-pointer max-md:w-28 max-md:flexer ${selectedItem === "orders" ? 'bg-gray-800 text-white' : 'hover:bg-gray-300'}`}
                        >
                            <h1>My Orders</h1>
                        </div>

                        {/* Create Posts Tab */}
                        <div 
                            onClick={() => setSelectedItem("manageposts")}
                            className={`pr-2 max-md:text-sm rounded-sm bg-base-300 flex pl-5 items-center max-md:px-2 h-16 cursor-pointer max-md:w-28 max-md:flexer ${selectedItem === "manageposts" ? 'bg-gray-800 text-white' : 'hover:bg-gray-300'}`}
                        >
                            <h1>Create Posts</h1>
                        </div>

                        {/* Products Tab */}
                        <div 
                            onClick={() => setSelectedItem("products")}
                            className={`pr-2 max-md:text-sm rounded-sm bg-base-300 flex pl-5 items-center max-md:px-2 h-16 cursor-pointer max-md:w-28 max-md:flexer ${selectedItem === "products" ? 'bg-gray-800 text-white' : 'hover:bg-gray-300'}`}
                        >
                            <h1>Products</h1>
                        </div>

                        {/* Order History Tab */}
                        <div 
                            onClick={() => setSelectedItem("orderhistory")}
                            className={`pr-2 max-md:text-sm rounded-sm bg-base-300 flex pl-5 items-center max-md:px-2 h-16 cursor-pointer max-md:w-28 max-md:flexer ${selectedItem === "orderhistory" ? 'bg-gray-800 text-white' : 'hover:bg-gray-300'}`}
                        >
                            <h1>Order History</h1>
                        </div>

                        {/* Messages Tab */}
                        <div 
                            onClick={() => setSelectedItem("messages")}
                            className={`pr-2 max-md:text-sm rounded-sm bg-base-300 flex pl-5 items-center max-md:px-2 h-16 cursor-pointer max-md:w-28 max-md:flexer ${selectedItem === "messages" ? 'bg-gray-800 text-white' : 'hover:bg-gray-300'}`}
                        >
                            <h1>Messages</h1>
                        </div>
                    </div>

                    <div className="min-h-[61vh] w-full md:w-[87%]">
                        {selectedItem === "orders" && <Orders />}
                        {selectedItem === "manageposts" && <CreatePosts />}
                        {selectedItem === "orderhistory" && <OrdersHistory />}
                        {selectedItem === "products" && <Products />}
                        {selectedItem === "messages" && <Messages />}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default Admin
