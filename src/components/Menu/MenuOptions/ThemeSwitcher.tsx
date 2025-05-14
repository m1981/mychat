import { useEffect } from 'react';

import MoonIcon from '@icon/MoonIcon';
import SunIcon from '@icon/SunIcon';
import useStore from '@store/store';
import { Theme } from '@type/theme';
import { useTranslation } from 'react-i18next';

const getOppositeTheme = (theme: Theme): Theme => {
  if (theme === 'dark') {
    return 'light';
  } else {
    return 'dark';
  }
};
const ThemeSwitcher = () => {
  const { t } = useTranslation();
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  const switchTheme = () => {
    setTheme(getOppositeTheme(theme!));
  };

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return theme ? (
    <button
      className='items-center gap-3 btn btn-neutral'
      onClick={switchTheme}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      {t(getOppositeTheme(theme) + 'Mode')}
    </button>
  ) : (
    <></>
  );
};

export default ThemeSwitcher;
