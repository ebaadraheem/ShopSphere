import React, { useEffect, useState, useContext } from 'react'
import Navbar from './Navbar'
import Menu from './Menu'
import Cards from './Cards'
import Footer from './Footer'
import UserContext from '../UserContext/UserContext'

const CategoryPage = ({ category }) => {
    const user = useContext(UserContext)
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        const filtered = user.data.filter(card => card.category === category)
        setItems(filtered)
        setLoading(false)
    }, [user.data, category])

    useEffect(() => {
        user.setQuery("")
    }, [])

    const filteredItems = user.getFilteredItems(items)

    return (
        <div>
            <Navbar />
            <Menu />
            <div className="min-h-[54vh] mt-5 2xl:mx-28 roboto_font flex">
                {loading ? (
                    <div className='flex justify-center items-center h-[45vh]'>
                        <svg className='w-10' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                            <circle fill="#0B0105" stroke="#0B0105" strokeWidth="2" r="15" cx="40" cy="100">
                                <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4" />
                            </circle>
                            <circle fill="#0B0105" stroke="#0B0105" strokeWidth="2" r="15" cx="100" cy="100">
                                <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2" />
                            </circle>
                            <circle fill="#0B0105" stroke="#0B0105" strokeWidth="2" r="15" cx="160" cy="100">
                                <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0" />
                            </circle>
                        </svg>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex justify-center items-center h-[54vh] w-full">
                        <h1 className="textlg">No items to show</h1>
                    </div>
                ) : (
                    <div className='flex justify-center w-full max-sm:gap-1 gap-2 flex-wrap xl:ml-5 max-xl:px-5 max-sm:px-2 '>
                        {filteredItems.map(card => (
                            <Cards key={card.id} cards={card} />
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    )
}

export default CategoryPage
