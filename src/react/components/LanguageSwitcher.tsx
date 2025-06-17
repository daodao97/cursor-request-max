import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../i18n'
import { Languages } from 'lucide-react'

const LanguageSwitcher: React.FC = () => {
    const { currentLanguage, changeLanguage, t, supportedLanguages } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const currentLang = supportedLanguages.find(lang => lang.code === currentLanguage)

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleLanguageChange = (languageCode: string) => {
        changeLanguage(languageCode)
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-md 
                         hover:bg-gray-100 dark:hover:bg-gray-800 
                         transition-colors duration-200"
                title={t.selectLanguage}
            >
                <Languages className="size-4" />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 right-0 z-50 
                              bg-white dark:bg-gray-800 
                              border border-gray-200 dark:border-gray-700 
                              rounded-md shadow-lg min-w-[100px]">
                    {supportedLanguages.map((language) => (
                        <button
                            key={language.code}
                            onClick={() => handleLanguageChange(language.code)}
                            className={`w-full px-2.5 py-1.5 text-left text-sm 
                                      hover:bg-gray-100 dark:hover:bg-gray-700 
                                      transition-colors duration-200
                                      first:rounded-t-md last:rounded-b-md
                                      flex items-center gap-2
                                      ${currentLanguage === language.code 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                        : ''}`}
                        >
                            <span className="text-sm">{language.flag}</span>
                            <span className="text-xs">{language.name}</span>
                            {currentLanguage === language.code && (
                                <span className="ml-auto text-blue-600 dark:text-blue-400 text-xs">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default LanguageSwitcher 