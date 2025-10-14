/**
 * 反馈页面功能
 */

class FeedbackPage {
    constructor() {
        this.rating = 0;
        this.selectedImages = [];
        this.maxImages = 3;
        this.maxImageSize = 5 * 1024 * 1024; // 5MB
        this.maxContentLength = 500;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCharCount();
        this.initLanguageSupport();
    }
    
    initLanguageSupport() {
        // 初始化语言显示，事件绑定由全局系统处理
        this.updateLanguageDisplay();
        
        // 监听语言切换事件，当语言改变时更新页面内容
        document.addEventListener('languageChanged', (event) => {
            this.updatePageContent(event.detail.language);
        });
    }

    switchLanguage(lang) {
        // 使用全局语言切换系统
        appState.setLanguage(lang);
        // 更新页面内容
        this.updatePageContent(lang);
    }

    updateLanguageDisplay() {
        const savedLang = localStorage.getItem('language') || 'zh';
        // 使用全局语言切换系统
        appState.setLanguage(savedLang);
        this.updatePageContent(savedLang);
    }
    
    updatePageContent(lang) {
        const translations = {
            zh: {
                'feedback.title': '反馈',
                'feedback.header': '您的反馈对我们很重要',
                'feedback.description': '请告诉我们您的使用体验，帮助我们改进产品',
                'feedback.rating': '整体评分',
                'feedback.selectRating': '请选择评分',
                'feedback.type': '反馈类型',
                'feedback.typeBug': '问题反馈',
                'feedback.typeSuggestion': '功能建议',
                'feedback.typePraise': '表扬鼓励',
                'feedback.typeOther': '其他',
                'feedback.content': '反馈内容',
                'feedback.contentPlaceholder': '请详细描述您的反馈内容...',
                'feedback.contact': '联系方式（可选）',
                'feedback.contactPlaceholder': '邮箱或手机号，便于我们回复您',
                'feedback.images': '相关图片（可选）',
                'feedback.uploadImage': '上传图片',
                'feedback.uploadHint': '支持JPG、PNG格式，最多3张，每张不超过5MB',
                'feedback.reset': '重置',
                'feedback.submit': '提交反馈',
                'feedback.submitting': '提交中...',
                'feedback.successTitle': '反馈提交成功！',
                'feedback.successMessage': '感谢您的反馈，我们会认真处理并持续改进产品体验',
                'feedback.backToHome': '返回首页',
                'nav.signin': '签到',
                'nav.statistics': '统计',
                'nav.records': '记录',
                'nav.feedback': '反馈'
            },
            en: {
                'feedback.title': 'Feedback',
                'feedback.header': 'Your Feedback Matters',
                'feedback.description': 'Tell us about your experience to help us improve',
                'feedback.rating': 'Overall Rating',
                'feedback.selectRating': 'Please select rating',
                'feedback.type': 'Feedback Type',
                'feedback.typeBug': 'Bug Report',
                'feedback.typeSuggestion': 'Feature Request',
                'feedback.typePraise': 'Praise',
                'feedback.typeOther': 'Other',
                'feedback.content': 'Feedback Content',
                'feedback.contentPlaceholder': 'Please describe your feedback in detail...',
                'feedback.contact': 'Contact Info (Optional)',
                'feedback.contactPlaceholder': 'Email or phone number for our reply',
                'feedback.images': 'Related Images (Optional)',
                'feedback.uploadImage': 'Upload Image',
                'feedback.uploadHint': 'Support JPG, PNG format, max 3 images, 5MB each',
                'feedback.reset': 'Reset',
                'feedback.submit': 'Submit Feedback',
                'feedback.submitting': 'Submitting...',
                'feedback.successTitle': 'Feedback Submitted Successfully!',
                'feedback.successMessage': 'Thank you for your feedback. We will review it carefully and continue to improve.',
                'feedback.backToHome': 'Back to Home',
                'nav.signin': 'Sign In',
                'nav.statistics': 'Statistics',
                'nav.records': 'Records',
                'nav.feedback': 'Feedback'
            }
        };
        
        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = translations[lang]?.[key];
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // 更新占位符文本
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = translations[lang]?.[key];
            if (translation) {
                element.placeholder = translation;
            }
        });
        
        // 更新页面标题
        document.title = translations[lang]?.['feedback.title'] + ' - ' + (lang === 'zh' ? '深圳大学考勤签到' : 'SZU Attendance System');
    }
    
    bindEvents() {
        // 星级评分事件
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                this.setRating(index + 1);
            });
            
            star.addEventListener('mouseenter', () => {
                this.highlightStars(index + 1);
            });
        });
        
        const starRating = document.getElementById('starRating');
        if (starRating) {
            starRating.addEventListener('mouseleave', () => {
                this.highlightStars(this.rating);
            });
        }
        
        // 文本域字符计数
        const feedbackContent = document.getElementById('feedbackContent');
        if (feedbackContent) {
            feedbackContent.addEventListener('input', () => {
                this.updateCharCount();
            });
        }
        
        // 图片上传事件
        const uploadBtn = document.getElementById('uploadBtn');
        const imageInput = document.getElementById('imageInput');
        
        if (uploadBtn && imageInput) {
            uploadBtn.addEventListener('click', () => {
                imageInput.click();
            });
            
            imageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files);
            });
        }
        
        // 表单提交事件
        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitFeedback();
            });
        }
        
        // 重置按钮事件
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                Utils.showConfirm(
                    Utils.t('reset_confirm_message'),
                    () => {
                        this.resetForm();
                    }
                );
            });
        }
        
        // 返回首页按钮事件
        const backToHomeBtn = document.getElementById('backToHomeBtn');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    }
    
    setRating(rating) {
        this.rating = rating;
        this.highlightStars(rating);
        this.updateRatingText(rating);
    }
    
    highlightStars(count) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < count) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    
    updateRatingText(rating) {
        const ratingText = document.getElementById('ratingText');
        if (!ratingText) return;
        
        const texts = appState.currentLanguage === 'zh' ? {
            1: '很不满意',
            2: '不满意',
            3: '一般',
            4: '满意',
            5: '非常满意'
        } : {
            1: 'Very Dissatisfied',
            2: 'Dissatisfied',
            3: 'Neutral',
            4: 'Satisfied',
            5: 'Very Satisfied'
        };
        ratingText.textContent = texts[rating] || Utils.t('feedback.selectRating');
    }
    
    updateCharCount() {
        const feedbackContent = document.getElementById('feedbackContent');
        const charCount = document.getElementById('charCount');
        
        if (feedbackContent && charCount) {
            const currentLength = feedbackContent.value.length;
            charCount.textContent = currentLength;
            
            // 超出限制时变红
            if (currentLength > this.maxContentLength) {
                charCount.style.color = 'var(--error-color)';
                feedbackContent.style.borderColor = 'var(--error-color)';
            } else {
                charCount.style.color = '';
                feedbackContent.style.borderColor = '';
            }
        }
    }
    
    handleImageUpload(files) {
        const fileArray = Array.from(files);
        
        // 检查图片数量限制
        if (this.selectedImages.length + fileArray.length > this.maxImages) {
            const message = appState.currentLanguage === 'zh' 
                ? `最多只能上传${this.maxImages}张图片`
                : `Maximum ${this.maxImages} images allowed`;
            Utils.showMessage(message, 'warning');
            return;
        }
        
        fileArray.forEach(file => {
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                const message = appState.currentLanguage === 'zh'
                    ? `${file.name} 不是有效的图片文件`
                    : `${file.name} is not a valid image file`;
                Utils.showMessage(message, 'error');
                return;
            }
            
            // 检查文件大小
            if (file.size > this.maxImageSize) {
                const message = appState.currentLanguage === 'zh'
                    ? `${file.name} 文件过大，请选择小于5MB的图片`
                    : `${file.name} is too large, please select an image under 5MB`;
                Utils.showMessage(message, 'error');
                return;
            }
            
            // 读取并预览图片
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addImagePreview(e.target.result, file);
            };
            reader.readAsDataURL(file);
        });
        
        // 清空input值，允许重复选择同一文件
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.value = '';
        }
    }
    
    addImagePreview(src, file) {
        const imagePreview = document.getElementById('imagePreview');
        if (!imagePreview) return;
        
        const imageId = Date.now() + Math.random();
        this.selectedImages.push({ id: imageId, file, src });
        
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${src}" alt="预览图片" class="preview-image">
            <button type="button" class="remove-image" data-id="${imageId}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        // 绑定删除事件
        const removeBtn = previewItem.querySelector('.remove-image');
        removeBtn.addEventListener('click', () => {
            this.removeImage(imageId);
            previewItem.remove();
        });
        
        imagePreview.appendChild(previewItem);
        
        // 更新上传按钮状态
        this.updateUploadButton();
    }
    
    removeImage(imageId) {
        this.selectedImages = this.selectedImages.filter(img => img.id !== imageId);
        this.updateUploadButton();
    }
    
    updateUploadButton() {
        const uploadBtn = document.getElementById('uploadBtn');
        if (!uploadBtn) return;
        
        if (this.selectedImages.length >= this.maxImages) {
            uploadBtn.style.display = 'none';
        } else {
            uploadBtn.style.display = 'flex';
        }
    }
    
    validateForm() {
        const errors = [];
        
        // 检查评分
        if (this.rating === 0) {
            const message = appState.currentLanguage === 'zh' ? '请选择评分' : 'Please select a rating';
            errors.push(message);
        }
        
        // 检查反馈类型
        const feedbackType = document.querySelector('input[name="feedbackType"]:checked');
        if (!feedbackType) {
            const message = appState.currentLanguage === 'zh' ? '请选择反馈类型' : 'Please select feedback type';
            errors.push(message);
        }
        
        // 检查反馈内容
        const feedbackContent = document.getElementById('feedbackContent');
        if (!feedbackContent || !feedbackContent.value.trim()) {
            const message = appState.currentLanguage === 'zh' ? '请填写反馈内容' : 'Please enter feedback content';
            errors.push(message);
        } else if (feedbackContent.value.length > this.maxContentLength) {
            const message = appState.currentLanguage === 'zh' 
                ? `反馈内容不能超过${this.maxContentLength}个字符`
                : `Feedback content cannot exceed ${this.maxContentLength} characters`;
            errors.push(message);
        }
        
        // 检查联系方式格式（如果填写了）
        const contactInfo = document.getElementById('contactInfo');
        if (contactInfo && contactInfo.value.trim()) {
            const contact = contactInfo.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^1[3-9]\d{9}$/;
            
            if (!emailRegex.test(contact) && !phoneRegex.test(contact)) {
                const message = appState.currentLanguage === 'zh' 
                    ? '请填写有效的邮箱或手机号'
                    : 'Please enter a valid email or phone number';
                errors.push(message);
            }
        }
        
        return errors;
    }
    
    async submitFeedback() {
        // 表单验证
        const errors = this.validateForm();
        if (errors.length > 0) {
            Utils.showMessage(errors[0], 'error');
            return;
        }
        
        // 显示加载状态
        this.setSubmitLoading(true);
        
        try {
            // 收集表单数据
            const formData = this.collectFormData();
            
            // 上传图片
            const uploadedImages = [];
            if (this.selectedImages.length > 0) {
                for (const imageData of this.selectedImages) {
                    try {
                        const uploadResult = await this.uploadImage(imageData.file);
                        if (uploadResult.success) {
                            uploadedImages.push(uploadResult.data.filename);
                        }
                    } catch (uploadError) {
                        console.error('图片上传失败:', uploadError);
                        // 继续处理其他图片，不中断整个流程
                    }
                }
            }
            
            // 准备发送到后端的数据
            const apiData = {
                rating: formData.rating,
                feedback_type: formData.type,
                content: formData.content,
                contact_info: formData.contact,
                images: uploadedImages, // 使用上传后的文件名
                user_id: appState.userInfo?.id // 添加用户ID
            };
            
            // 发送到后端API
            const response = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 显示成功消息
                this.showSuccessMessage();
            } else {
                throw new Error(result.message || '提交失败');
            }
            
        } catch (error) {
            console.error('提交反馈失败:', error);
            const errorMessage = error.message || (appState.currentLanguage === 'zh' 
                ? '提交失败，请稍后重试'
                : 'Submission failed, please try again later');
            Utils.showMessage(errorMessage, 'error');
        } finally {
            this.setSubmitLoading(false);
        }
    }
    
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/feedback/upload', {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }
    
    collectFormData() {
        const feedbackType = document.querySelector('input[name="feedbackType"]:checked');
        const feedbackContent = document.getElementById('feedbackContent');
        const contactInfo = document.getElementById('contactInfo');
        
        return {
            rating: this.rating,
            type: feedbackType ? feedbackType.value : '',
            content: feedbackContent ? feedbackContent.value.trim() : '',
            contact: contactInfo ? contactInfo.value.trim() : '',
            images: this.selectedImages.map(img => ({
                name: img.file.name,
                size: img.file.size,
                type: img.file.type
            })),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
    }
    
    setSubmitLoading(loading) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (loading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    }
    
    showSuccessMessage() {
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    resetForm() {
        // 重置评分
        this.rating = 0;
        this.highlightStars(0);
        this.updateRatingText(0);
        
        // 重置表单
        const form = document.getElementById('feedbackForm');
        if (form) {
            form.reset();
        }
        
        // 清空图片
        this.selectedImages = [];
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
        }
        
        // 更新字符计数
        this.updateCharCount();
        
        // 更新上传按钮
        this.updateUploadButton();
        
        Utils.showMessage(Utils.t('form_reset'), 'info');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new FeedbackPage();
});