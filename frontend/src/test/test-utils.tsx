import { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

interface RouteConfig {
  path: string;
  element: ReactElement;
}

export function renderRoutes(routes: RouteConfig[], initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        {routes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}
