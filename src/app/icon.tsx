import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#4F46E5',
          borderRadius: '128px', // arredondar as pontas (25%)
          color: 'white',
          fontSize: '240px',
          fontWeight: 800,
          fontFamily: 'sans-serif',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        SA
      </div>
    ),
    { ...size }
  );
}
