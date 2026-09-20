import { createContext, useContext, useState } from "react";
import { getTimezoneOffset, setTimezoneOffset } from "./timezone.js";

const TimezoneContext = createContext(null);

export function TimezoneProvider({ children }) {
  const [offset, setOffsetState] = useState(getTimezoneOffset);

  function setOffset(value) {
    setTimezoneOffset(value);
    setOffsetState(value);
  }

  return (
    <TimezoneContext.Provider value={{ offset, setOffset }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
