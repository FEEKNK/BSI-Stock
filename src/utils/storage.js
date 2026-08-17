export const storage = {
  save: (key, data) => {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (error) {
      console.error(`Error saving data to localStorage (key: ${key}):`, error);
    }
  },

  load: (key, defaultValue = null) => {
    try {
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) {
        return defaultValue;
      }
      return JSON.parse(serializedData);
    } catch (error) {
      console.error(`Error loading data from localStorage (key: ${key}):`, error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing data from localStorage (key: ${key}):`, error);
    }
  },
};
