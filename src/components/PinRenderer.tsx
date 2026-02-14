import React, { useState, useRef, useEffect } from 'react';
import { PinHoverCard } from './PinHoverCard';

interface PinTemplate {
  id: string;
  name: string;
  description?: string;
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom';
  color: string;
  size: 'small' | 'medium' | 'large';
  icon?: string;
  style?: any;
  imageUrl?: string;
  isDefault: boolean;
  isPublic: boolean;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'url';
  url: string;
  name?: string;
}

interface PinData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  layerId: string;
  canvasId: string;
  templateId?: string;
  template?: PinTemplate;
  mediaItems?: MediaItem[];
}

interface PinRendererProps {
  pin: PinData;
  template: PinTemplate | null;
  onClick: () => void;
  isVisible: boolean;
  layerColor?: string;
  onPositionChange?: (pinId: string, relativeX: number, relativeY: number) => void;
  canEdit?: boolean;
  containerWidth?: number;
  containerHeight?: number;
}

const pinSizeMap = {
  small: { width: 20, height: 28 },
  medium: { width: 28, height: 38 },
  large: { width: 36, height: 48 },
};

// 핀 모양 SVG 컴포넌트 - 지도 핀(맵 마커) 형태
const MapPinIcon: React.FC<{ color: string; width: number; height: number }> = ({ color, width, height }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
  >
    {/* 핀 몸체 - 물방울/핀 모양 */}
    <path
      d="M12 0C5.373 0 0 5.373 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.373 18.627 0 12 0z"
      fill={color}
    />
    {/* 핀 내부 원 (밝은 하이라이트) */}
    <circle
      cx="12"
      cy="11"
      r="5"
      fill="white"
      opacity="0.9"
    />
    {/* 핀 내부 작은 원 (색상 도트) */}
    <circle
      cx="12"
      cy="11"
      r="3"
      fill={color}
      opacity="0.8"
    />
    {/* 반사광 효과 */}
    <ellipse
      cx="8.5"
      cy="7"
      rx="2.5"
      ry="1.5"
      fill="white"
      opacity="0.3"
      transform="rotate(-20 8.5 7)"
    />
  </svg>
);

// 기존 하드코딩된 템플릿에서 색상만 추출하는 매핑
const getHardcodedColor = (templateId: string): string | null => {
  const colorMap: Record<string, string> = {
    'default-circle': '#3b82f6',
    'default-square': '#10b981',
    'default-triangle': '#f59e0b',
    'default-star': '#ef4444',
    'custom-1': '#ff0000',
    'custom-2': '#00ff00',
    'custom-3': '#0000ff',
    'custom-4': '#ffff00',
    'custom-5': '#ff00ff',
    'custom-6': '#00ffff',
    'custom-7': '#ff8800',
    'custom-8': '#88ff00',
    'custom-9': '#0088ff',
    'custom-10': '#ff0088',
    'custom-11': '#88ff88',
    'custom-12': '#8888ff',
    'custom-13': '#ff8888',
    'custom-14': '#88ffff',
    'custom-15': '#ffff88',
    'custom-16': '#ff88ff',
  };
  return colorMap[templateId] || null;
};

export const PinRenderer: React.FC<PinRendererProps> = ({
  pin,
  template,
  onClick,
  isVisible,
  layerColor,
  onPositionChange,
  canEdit = false,
  containerWidth = 1200,
  containerHeight = 800,
}) => {
  // 핀 색상 결정: layerColor > template color > hardcoded color > default
  const resolveColor = (): string => {
    if (layerColor) return layerColor;
    if (template?.color) return template.color;
    if (pin.templateId) {
      const hardcoded = getHardcodedColor(pin.templateId);
      if (hardcoded) return hardcoded;
    }
    return '#3b82f6'; // 기본 파란색
  };

  const pinColor = resolveColor();
  const pinSize = pinSizeMap[template?.size || 'medium'];

  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({
    x: isNaN(pin.x) ? 0 : pin.x,
    y: isNaN(pin.y) ? 0 : pin.y
  });
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const pinRef = useRef<HTMLDivElement>(null);
  const finalPositionRef = useRef({ x: pin.x, y: pin.y });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update position when pin position changes (only if not dragging and position actually changed)
  useEffect(() => {
    if (!isDragging) {
      const safeX = isNaN(pin.x) ? 0 : pin.x;
      const safeY = isNaN(pin.y) ? 0 : pin.y;
      const hasChanged = currentPosition.x !== safeX || currentPosition.y !== safeY;
      if (hasChanged) {
        console.log(`🐛 Pin ${pin.id} position update:`, {
          originalX: pin.x, originalY: pin.y,
          safeX, safeY,
          templateId: pin.templateId
        });
        setCurrentPosition({ x: safeX, y: safeY });
      }
    }
  }, [pin.x, pin.y, isDragging, currentPosition.x, currentPosition.y]);

  if (!isVisible) return null;

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canEdit) return;

    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPinX = currentPosition.x;
    const startPinY = currentPosition.y;

    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Only start dragging if moved more than 3px
      if (!hasMoved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        setIsDragging(true);
        hasMoved = true;
      }

      if (hasMoved) {
        const newAbsoluteX = startPinX + deltaX;
        const newAbsoluteY = startPinY + deltaY;

        const clampedX = Math.max(0, Math.min(containerWidth, newAbsoluteX));
        const clampedY = Math.max(0, Math.min(containerHeight, newAbsoluteY));

        const relativeX = clampedX / containerWidth;
        const relativeY = clampedY / containerHeight;

        const newPos = {
          x: clampedX,
          y: clampedY
        };
        setCurrentPosition(newPos);

        finalPositionRef.current = { x: relativeX, y: relativeY };
      }
    };

    const handleMouseUp = () => {
      if (hasMoved && onPositionChange) {
        onPositionChange(pin.id, finalPositionRef.current.x, finalPositionRef.current.y);
      }

      setTimeout(() => {
        setIsDragging(false);
      }, 10);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isDragging) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const currentTarget = e.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top
    };

    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPosition(position);
      setIsHovered(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 모든 핀을 맵 핀 모양으로 통일 렌더링
  return (
    <div
      ref={pinRef}
      className={`absolute hover:scale-110 transition-transform duration-200 z-10 ${
        canEdit ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
      }`}
      style={{
        // 핀의 뾰족한 끝이 정확한 좌표를 가리키도록 오프셋
        left: Math.round(isNaN(currentPosition.x) ? 0 : currentPosition.x) - pinSize.width / 2,
        top: Math.round(isNaN(currentPosition.y) ? 0 : currentPosition.y) - pinSize.height,
        zIndex: isDragging ? 200 : 100,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <MapPinIcon
        color={pinColor}
        width={pinSize.width}
        height={pinSize.height}
      />

      {/* 핀 제목 라벨 */}
      {pin.title && (
        <div
          className="absolute text-center whitespace-nowrap pointer-events-none"
          style={{
            top: pinSize.height + 2,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            fontWeight: 600,
            color: '#334155',
            textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white',
            maxWidth: '80px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {pin.title}
        </div>
      )}

      {/* Advanced Hover Card */}
      <PinHoverCard
        pin={pin}
        isVisible={isHovered && !isDragging}
        position={hoverPosition}
      />
    </div>
  );
};
