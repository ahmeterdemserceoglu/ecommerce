'use client'

import React, { useEffect, useRef } from 'react';
import Quill, { type QuillOptions, type DeltaStatic, type Sources } from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

const defaultModules: QuillOptions['modules'] = {
    toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ],
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    readOnly = false,
}) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const quillInstanceRef = useRef<Quill | null>(null);
    const initialValueRef = useRef(value); // Store initial value to set only once if needed

    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const editorNode = editorContainerRef.current;
        if (!editorNode) {
            return;
        }

        if (quillInstanceRef.current) {
            return; // Quill instance already exists, do not re-initialize
        }

        // Ensure the container is empty before Quill initializes to prevent duplicate elements
        editorNode.innerHTML = '';

        const options: QuillOptions = {
            theme: 'snow',
            modules: defaultModules,
            placeholder: placeholder,
            readOnly: readOnly,
        };

        const quill = new Quill(editorNode, options);
        quillInstanceRef.current = quill;

        if (initialValueRef.current) {
            const isHTML = /<[a-z][\s\S]*>/i.test(initialValueRef.current);
            if (isHTML) {
                const delta = quill.clipboard.convert(initialValueRef.current);
                quill.setContents(delta, 'silent');
            } else {
                quill.setText(initialValueRef.current, 'silent');
            }
        } else {
            quill.setContents([] as any, 'silent');
        }

        const handleChange = (delta: DeltaStatic, oldDelta: DeltaStatic, source: Sources) => {
            if (source === 'user') {
                let html = quill.root.innerHTML;
                if (html === '<p><br></p>') {
                    html = '';
                }
                onChangeRef.current(html);
            }
        };
        quill.on('text-change', handleChange);

        return () => {
            const currentQuillInstance = quillInstanceRef.current;
            if (currentQuillInstance && typeof currentQuillInstance.off === 'function') {
                currentQuillInstance.off('text-change', handleChange);
            }

            // More aggressive cleanup: remove toolbar and editor content
            if (editorNode) {
                const toolbar = editorNode.querySelector('.ql-toolbar');
                if (toolbar && toolbar.parentNode === editorNode) {
                    editorNode.removeChild(toolbar);
                }
                // Quill often creates a div for the editor content itself inside the container.
                // Clearing innerHTML here again ensures the content area is also wiped.
                editorNode.innerHTML = '';
            }
            quillInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Reverted dependency array to ensure this runs only once on mount

    // Effect to update editor content if `value` prop changes from outside
    useEffect(() => {
        const quill = quillInstanceRef.current;
        if (quill) {
            const editorHtml = quill.root.innerHTML;
            const isEmptyEditor = editorHtml === '<p><br></p>';

            if (value === '' && !isEmptyEditor) {
                quill.setContents([] as any, 'silent');
            } else if (value !== '' && value !== editorHtml && !(value === '<p><br></p>' && isEmptyEditor)) {
                // Only update if the new value is different and not an empty state echo
                const isHTML = /<[a-z][\s\S]*>/i.test(value);
                if (isHTML) {
                    const delta = quill.clipboard.convert(value);
                    quill.setContents(delta, 'silent');
                } else {
                    quill.setText(value, 'silent');
                }
            }
        }
    }, [value]);

    // Effect to update readOnly state
    useEffect(() => {
        const quill = quillInstanceRef.current;
        if (quill) {
            quill.enable(!readOnly);
        }
    }, [readOnly]);

    // Effect to update placeholder if it changes dynamically (less common)
    useEffect(() => {
        const quill = quillInstanceRef.current;
        if (quill && placeholder && quill.root.dataset.placeholder !== placeholder) {
            quill.root.dataset.placeholder = placeholder;
        }
    }, [placeholder]);

    return <div ref={editorContainerRef} className={className} style={{ minHeight: '200px' }} />;
};

export default RichTextEditor; 