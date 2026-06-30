import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';

// undefined = no provider; null = loading; object = loaded bundle
const HomeDataContext = createContext(undefined);

export const useHomeData = () => useContext(HomeDataContext);

export const HomeDataProvider = ({ children }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiClient.get('/cms/home-bundle/')
      .then(res => setData(res.data || {}))
      .catch(() => setData({}));
  }, []);

  return <HomeDataContext.Provider value={data}>{children}</HomeDataContext.Provider>;
};

export default HomeDataContext;
