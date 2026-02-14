import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Palette,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface PinTemplateSelectorProps {
  selectedTemplate: PinTemplate | null;
  onTemplateSelect: (template: PinTemplate) => void;
  onClose: () => void;
}

// 핀 모양 미리보기 SVG
const PinPreview: React.FC<{ color: string; size?: number }> = ({ color, size = 40 }) => (
  <svg
    width={size * 0.75}
    height={size}
    viewBox="0 0 24 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
  >
    <path
      d="M12 0C5.373 0 0 5.373 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.373 18.627 0 12 0z"
      fill={color}
    />
    <circle cx="12" cy="11" r="5" fill="white" opacity="0.9" />
    <circle cx="12" cy="11" r="3" fill={color} opacity="0.8" />
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

// 사전 정의된 색상 팔레트
const colorPalette = [
  { id: 'pin-red', name: '빨강', color: '#ef4444' },
  { id: 'pin-orange', name: '주황', color: '#f97316' },
  { id: 'pin-amber', name: '호박', color: '#f59e0b' },
  { id: 'pin-yellow', name: '노랑', color: '#eab308' },
  { id: 'pin-lime', name: '라임', color: '#84cc16' },
  { id: 'pin-green', name: '초록', color: '#22c55e' },
  { id: 'pin-emerald', name: '에메랄드', color: '#10b981' },
  { id: 'pin-teal', name: '청록', color: '#14b8a6' },
  { id: 'pin-cyan', name: '시안', color: '#06b6d4' },
  { id: 'pin-sky', name: '하늘', color: '#0ea5e9' },
  { id: 'pin-blue', name: '파랑', color: '#3b82f6' },
  { id: 'pin-indigo', name: '남색', color: '#6366f1' },
  { id: 'pin-violet', name: '보라', color: '#8b5cf6' },
  { id: 'pin-purple', name: '자주', color: '#a855f7' },
  { id: 'pin-fuchsia', name: '자홍', color: '#d946ef' },
  { id: 'pin-pink', name: '분홍', color: '#ec4899' },
  { id: 'pin-rose', name: '장미', color: '#f43f5e' },
  { id: 'pin-slate', name: '슬레이트', color: '#64748b' },
  { id: 'pin-gray', name: '회색', color: '#6b7280' },
  { id: 'pin-black', name: '검정', color: '#1e293b' },
];

// 핀 크기 옵션
const sizeOptions = [
  { id: 'small', name: '소', label: 'S' },
  { id: 'medium', name: '중', label: 'M' },
  { id: 'large', name: '대', label: 'L' },
];

export const PinTemplateSelector: React.FC<PinTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onClose,
}) => {
  const [selectedColor, setSelectedColor] = useState(selectedTemplate?.color || '#3b82f6');
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>(selectedTemplate?.size || 'medium');
  const [customColor, setCustomColor] = useState(selectedTemplate?.color || '#3b82f6');
  const { toast } = useToast();

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    const template: PinTemplate = {
      id: `pin-color-${selectedColor.replace('#', '')}`,
      name: `핀 (${selectedColor})`,
      shape: 'circle',
      color: selectedColor,
      size: selectedSize,
      isDefault: true,
      isPublic: true,
    };
    onTemplateSelect(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">핀 색상 선택</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            ×
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 핀 미리보기 */}
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl">
              <PinPreview color={selectedColor} size={64} />
              <span className="text-sm font-medium text-gray-600">미리보기</span>
            </div>
          </div>

          {/* 색상 팔레트 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">색상 선택</h3>
            <div className="grid grid-cols-10 gap-2">
              {colorPalette.map((item) => (
                <button
                  key={item.id}
                  className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-all ${
                    selectedColor === item.color
                      ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400'
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: item.color }}
                  onClick={() => handleColorSelect(item.color)}
                  title={item.name}
                />
              ))}
            </div>
          </div>

          {/* 커스텀 색상 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">사용자 정의 색상</h3>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
              />
              <span className="text-sm text-gray-500 font-mono">{customColor}</span>
            </div>
          </div>

          {/* 크기 선택 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">핀 크기</h3>
            <div className="flex gap-3">
              {sizeOptions.map((option) => (
                <button
                  key={option.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    selectedSize === option.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSize(option.id as 'small' | 'medium' | 'large')}
                >
                  <PinPreview color={selectedColor} size={option.id === 'small' ? 20 : option.id === 'medium' ? 28 : 36} />
                  <span className="text-sm font-medium">{option.name} ({option.label})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleConfirm}>
            선택 완료
          </Button>
        </div>
      </div>
    </div>
  );
};
