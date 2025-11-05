import { useState, useRef, useCallback, useEffect } from 'react';
import { validateImageFile } from '../utils';

export interface UseImagePreviewReturn {
    selectedFile: File | null;
    previewUrl: string | null;
    error: string | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    clearImage: () => void;
}

/**
 * Custom hook for managing image preview state
 * Handles file selection, validation, preview URL creation, and cleanup
 */
export function useImagePreview(): UseImagePreviewReturn {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Handle file selection and validation
     */
    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            setError(validation.error || 'Invalid image file');
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }

        // Clear any previous errors
        setError(null);

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setSelectedFile(file);
    }, []);

    /**
     * Clear selected image and preview
     */
    const clearImage = useCallback(() => {
        // Revoke old preview URL to free memory
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(null);
        setPreviewUrl(null);
        setError(null);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [previewUrl]);

    /**
     * Cleanup preview URL on unmount
     */
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return {
        selectedFile,
        previewUrl,
        error,
        fileInputRef,
        handleFileSelect,
        clearImage,
    };
}
