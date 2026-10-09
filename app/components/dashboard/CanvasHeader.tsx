import IntelligentSearch from './IntelligentSearch';

export function CanvasHeader() {
  return (
    <div className="bg-canvas-red px-5 h-12 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.9"/>
          <circle cx="12" cy="12" r="4" fill="hsl(var(--canvas-red))"/>
        </svg>
        <span className="text-[15px] font-semibold text-white tracking-wide">canvas</span>
        <div className="w-px h-5 bg-white/30 mx-2" />
        <span className="text-xs text-white/80">Lincoln High School</span>
      </div>
      <div className="flex items-center gap-3">
        <IntelligentSearch />
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs text-white">
          Ms
        </div>
      </div>
    </div>
  );
}
