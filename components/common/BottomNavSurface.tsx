interface BottomNavSurfaceProps {
  testIdPrefix: 'bottom-nav' | 'guest-bottom-nav';
}

const BottomNavSurface = ({ testIdPrefix }: BottomNavSurfaceProps) => (
  <div
    data-testid={`${testIdPrefix}-surface`}
    aria-hidden="true"
    className="absolute inset-0 drop-shadow-[0_-4px_7px_rgba(0,0,0,0.17)] dark:drop-shadow-[0_-4px_7px_rgba(148,163,184,0.12)]"
  >
    <div
      data-testid={`${testIdPrefix}-surface-left`}
      className="absolute bottom-0 left-0 top-[35px] w-[calc(50%_-_48px)] bg-white dark:bg-black"
    />
    <div
      data-testid={`${testIdPrefix}-surface-right`}
      className="absolute bottom-0 right-0 top-[35px] w-[calc(50%_-_48px)] bg-white dark:bg-black"
    />
    <div className="absolute inset-x-0 bottom-0 top-[83px] bg-white dark:bg-black" />
    <svg
      data-testid={`${testIdPrefix}-curve`}
      viewBox="0 0 96 84"
      className="absolute left-1/2 top-0 h-[84px] w-[96px] -translate-x-1/2 text-white dark:text-black"
    >
      <path
        fill="currentColor"
        d="M0 35 C4 35 8.2 33.9 9.59 41.77 C12.88 60.4 29.07 74 48 74 C66.93 74 83.12 60.4 86.41 41.77 C87.8 33.9 92 35 96 35 V84 H0 Z"
      />
    </svg>
    <svg
      data-testid={`${testIdPrefix}-outline-layer`}
      className="pointer-events-none absolute inset-x-0 top-0 h-[84px] w-full overflow-hidden stroke-gray-200 dark:stroke-gray-700"
    >
      <line
        x1="0"
        y1="35"
        x2="50%"
        y2="35"
        transform="translate(-48 0)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="50%"
        y1="35"
        x2="100%"
        y2="35"
        transform="translate(48 0)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <svg
        x="50%"
        y="0"
        width="96"
        height="84"
        viewBox="0 0 96 84"
        transform="translate(-48 0)"
        overflow="visible"
      >
        <path
          data-testid={`${testIdPrefix}-outline`}
          fill="none"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="stroke-gray-200 dark:stroke-gray-700"
          d="M0 35 C4 35 8.2 33.9 9.59 41.77 C12.88 60.4 29.07 74 48 74 C66.93 74 83.12 60.4 86.41 41.77 C87.8 33.9 92 35 96 35"
        />
      </svg>
    </svg>
  </div>
);

export default BottomNavSurface;
