/**
 * PrairieBackdrop — fixed pixel-art scenery behind all content.
 * Sky gradient is painted by the body (var(--stage-backdrop), reset.css);
 * this adds the pixel sun, drifting clouds, mesa/cactus skyline and a
 * whisper-subtle scanline overlay. Pure decoration: aria-hidden, no events.
 * Styles: src/styles/components/decor.css
 */
export default function PrairieBackdrop() {
  return (
    <>
      <div className="prairie-sky" aria-hidden="true" />
      <div className="prairie-sun" aria-hidden="true">
        <svg viewBox="0 0 60 60" shapeRendering="crispEdges">
          <g className="rays" fill="var(--sun-ring)">
            <rect x="28" y="2" width="4" height="8" />
            <rect x="28" y="50" width="4" height="8" />
            <rect x="2" y="28" width="8" height="4" />
            <rect x="50" y="28" width="8" height="4" />
            <rect x="10" y="10" width="4" height="4" /><rect x="14" y="14" width="4" height="4" />
            <rect x="46" y="10" width="4" height="4" /><rect x="42" y="14" width="4" height="4" />
            <rect x="10" y="46" width="4" height="4" /><rect x="14" y="42" width="4" height="4" />
            <rect x="46" y="46" width="4" height="4" /><rect x="42" y="42" width="4" height="4" />
          </g>
          <g fill="var(--sun-ring)">
            <rect x="24" y="16" width="12" height="2" />
            <rect x="20" y="18" width="20" height="2" />
            <rect x="18" y="20" width="24" height="4" />
            <rect x="16" y="24" width="28" height="12" />
            <rect x="18" y="36" width="24" height="4" />
            <rect x="20" y="40" width="20" height="2" />
            <rect x="24" y="42" width="12" height="2" />
          </g>
          <g fill="var(--sun-core)">
            <rect x="24" y="20" width="12" height="2" />
            <rect x="22" y="22" width="16" height="2" />
            <rect x="20" y="24" width="20" height="10" />
            <rect x="22" y="34" width="16" height="2" />
            <rect x="24" y="36" width="12" height="2" />
          </g>
        </svg>
      </div>

      <div className="prairie-cloud c1" aria-hidden="true">
        <svg viewBox="0 0 48 16" shapeRendering="crispEdges" fill="#fdf3dd">
          <rect x="8" y="8" width="36" height="6" />
          <rect x="14" y="4" width="18" height="4" />
          <rect x="18" y="2" width="8" height="2" />
          <rect x="4" y="10" width="4" height="4" />
        </svg>
      </div>
      <div className="prairie-cloud c2" aria-hidden="true">
        <svg viewBox="0 0 48 16" shapeRendering="crispEdges" fill="#fdf3dd">
          <rect x="6" y="9" width="34" height="5" />
          <rect x="12" y="5" width="14" height="4" />
          <rect x="30" y="6" width="8" height="3" />
        </svg>
      </div>
      <div className="prairie-cloud c3" aria-hidden="true">
        <svg viewBox="0 0 48 16" shapeRendering="crispEdges" fill="#fdf3dd">
          <rect x="4" y="8" width="40" height="6" />
          <rect x="10" y="4" width="20" height="4" />
          <rect x="34" y="5" width="8" height="3" />
        </svg>
      </div>

      <div className="prairie-horizon" aria-hidden="true">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
          <g fill="var(--mesa-far)" opacity="0.7">
            <polygon points="0,220 0,150 40,150 40,130 60,130 60,110 180,110 180,130 200,130 200,150 260,150 260,220" />
            <polygon points="520,220 520,160 560,160 560,135 580,135 580,120 700,120 700,135 720,135 720,160 780,160 780,220" />
            <polygon points="1080,220 1080,145 1120,145 1120,120 1140,120 1140,105 1280,105 1280,120 1300,120 1300,145 1360,145 1360,220" />
          </g>
          <g fill="var(--mesa-near)">
            <rect x="0" y="196" width="1440" height="24" />
            <polygon points="180,220 180,170 220,170 220,150 240,150 240,140 340,140 340,150 360,150 360,170 420,170 420,220" />
            <polygon points="820,220 820,175 860,175 860,155 880,155 880,145 1000,145 1000,155 1020,155 1020,175 1060,175 1060,220" />
            <g>
              <rect x="500" y="150" width="14" height="70" />
              <rect x="482" y="166" width="10" height="8" /><rect x="482" y="146" width="8" height="24" />
              <rect x="522" y="176" width="10" height="8" /><rect x="524" y="158" width="8" height="22" />
            </g>
            <g>
              <rect x="1190" y="162" width="12" height="58" />
              <rect x="1174" y="176" width="9" height="7" /><rect x="1174" y="158" width="7" height="22" />
            </g>
            <g>
              <rect x="120" y="186" width="10" height="34" />
              <rect x="134" y="192" width="8" height="6" /><rect x="136" y="180" width="6" height="16" />
            </g>
          </g>
        </svg>
      </div>

      <div className="prairie-scanlines" aria-hidden="true" />
    </>
  );
}
