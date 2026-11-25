import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", hasError, workspaceMotion=false, controlId, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const triggerRef=useRef(null), searchRef=useRef(null);
  function close(focus=false){setIsOpen(false);setSearch("");if(focus)triggerRef.current?.focus();}

  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(()=>{if(workspaceMotion&&isOpen)searchRef.current?.focus();},[workspaceMotion,isOpen]);
  if(workspaceMotion)return <div className="cw-contact-select" ref={dropdownRef} onKeyDown={e=>{if(isOpen&&e.key==="Escape"){e.preventDefault();e.stopPropagation();close(true);}}}>
    <button ref={triggerRef} id={controlId} type="button" className="cw-button cw-contact-select-trigger" aria-label={label+(value?": "+value:"")} aria-expanded={isOpen} aria-controls={controlId+"-options"} aria-invalid={!!hasError} onClick={()=>isOpen?close():setIsOpen(true)}><span>{value||placeholder}</span><ChevronDown size={16} aria-hidden="true"/></button>
    {isOpen&&<div id={controlId+"-options"} className="cw-contact-select-menu"><input ref={searchRef} type="search" aria-label={"Search "+label.toLowerCase()} placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();dropdownRef.current?.querySelector(".cw-contact-select-options button")?.focus();}}}/><div className="cw-contact-select-options" role="group" aria-label={label+" options"}>{filteredOptions.length?filteredOptions.map(option=><button key={option} type="button" aria-pressed={value===option} onClick={()=>{onChange(option);close(true);}}>{option}</button>):<p className="cw-muted" role="status">No matches</p>}</div></div>}
  </div>;
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className={`w-full px-3 py-2 border rounded-lg focus-within:ring-2 transition-all text-sm bg-white flex justify-between items-center cursor-pointer min-h-[38px] ${hasError ? 'border-red-500 focus-within:ring-red-500/20 focus-within:border-red-500' : 'border-slate-300 focus-within:ring-blue-500/20 focus-within:border-blue-500'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-slate-800" : "text-slate-400 truncate pr-2"}>{value || placeholder}</span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input 
              type="text" 
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div 
                  key={option}
                  className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-slate-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
