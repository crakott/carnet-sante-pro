import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext({ open: false, setOpen: () => {} });

export function SearchProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext);
