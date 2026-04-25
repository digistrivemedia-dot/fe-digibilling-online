import '@testing-library/jest-dom';

// Mock next/navigation (used in almost every page component)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
  useParams: () => ({}),
}));

// Mock next/image — plain object, no JSX needed in setup file
vi.mock('next/image', () => ({
  default: ({ src, alt }) => ({ type: 'img', props: { src, alt } }),
}));

// Silence React act() warnings in tests
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
