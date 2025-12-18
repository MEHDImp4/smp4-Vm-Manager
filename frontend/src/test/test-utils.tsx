import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactNode,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
