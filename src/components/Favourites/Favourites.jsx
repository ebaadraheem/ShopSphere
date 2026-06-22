import { Link } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import UserContext from '../../UserContext/UserContext';
import React from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import Menu from '../Menu';
import Cards from '../Cards';

const Favourites = () => {
  const user = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavourites = async () => {
      user.setQuery("");
      // simulate or await fetching if needed
      await new Promise(resolve => setTimeout(resolve, 500)); // optional delay
      setIsLoading(false);
    };

    fetchFavourites();
  }, []);

  const filtereditems = user.getFilteredItems(user.favourite);

  return (
    <>
      <Navbar />
      <Menu />
      <div className='min-h-[57vh]'>
        <div className='md:ml-12'>
          <div className='pl-6 h-16 flex items-end pb-3'>
            <h1 className='text-lg md:text-xl roboto_font'>Favourites</h1>
          </div>
          <div className='px-6 flexer mb-5'>
            <hr className='w-[100%]' />
          </div>

          {/* Loading spinner */}
          {isLoading && (
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
          )}

          {/* No items message (only after loading) */}
          {!isLoading && filtereditems.length === 0 && (
            <div className='flex flex-col justify-center items-center h-[45vh]'>
              <h1 className='textlg'>No items to show</h1>
              <Link to="/">
                <div className='max-sm:text-xs flexer gap-2 mx-6 h-16'>
                  <button className="roboto_font btn max-md:w-[170px] w-[200px]">Back to Homepage</button>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Cards list */}
        <div className='roboto_font md:pl-12 md:pr-5 flex gap-2 flex-wrap md:ml-5 max-md:px-5'>
          {!isLoading && filtereditems.map((cards) => (
            <Cards key={cards.id} cards={cards} />
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Favourites;
