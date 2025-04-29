import { debounce } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';

import SearchBar from '@components/SearchBar';
import useStore from '@store/store';

interface ChatSearchProps {
  filter: string;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
}

const ChatSearch: React.FC<ChatSearchProps> = ({ filter, setFilter }) => {
  const [_filter, _setFilter] = useState<string>(filter);
  const generating = useStore((state) => state.generating);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    _setFilter(e.target.value);
  };

  const debouncedUpdateFilter = useRef(
    debounce((f: string) => {
      setFilter(f);
    }, 500)
  ).current;

  useEffect(() => {
    debouncedUpdateFilter(_filter);
  }, [_filter, debouncedUpdateFilter]);

  return (
    <SearchBar
      value={_filter}
      handleChange={handleChange}
      className='h-8 mb-2'
      disabled={generating}
    />
  );
};

export default ChatSearch;
