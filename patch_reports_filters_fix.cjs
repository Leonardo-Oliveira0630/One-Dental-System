const fs = require('fs');

const filePath = './pages/Reports.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Target the Filters Box grid and replace with restructured primary filters
const oldFiltersBoxTarget = `        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600" /> {t('reports.baseDate', 'Data Base')}
            </label>
            <select 
              value={dateType} 
              onChange={(e) => setDateType(e.target.value as any)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            >
              <option value="CREATED">{t('reports.entryDateCreation', 'Data de Entrada (Criação do Caso)')}</option>
              <option value="DUE">{t('reports.dueDateExpiration', 'Data de Entrega (Vencimento)')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.startDate', 'Data Inicial')}</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.endDate', 'Data Final')}</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          {/* CLIENT / DENTIST FILTER WITH SEARCH-AS-YOU-TYPE AND DROPDOWN */}
          <div className="space-y-1.5" ref={dentistDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Stethoscope size={13} className="text-teal-600" /> {t('reports.clientDentist', 'Cliente / Dentista')}
              </label>
              {dentistId && (
                <button
                  type="button"
                  onClick={() => {
                    setDentistId('');
                    setDentistSearchText('');
                    setShowDentistDropdown(false);
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>

            <div className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={dentistSearchText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDentistSearchText(val);
                    setShowDentistDropdown(true);
                    if (!val.trim()) {
                      setDentistId('');
                    } else {
                      const exact = allClientOptions.find(d => 
                        d.name.toLowerCase() === val.trim().toLowerCase() ||
                        \`\${d.name} (\${d.clinicName})\`.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (exact) setDentistId(exact.id);
                    }
                  }}
                  onFocus={() => setShowDentistDropdown(true)}
                  onClick={() => setShowDentistDropdown(true)}
                  placeholder={t('reports.searchClientPlaceholderInput', 'Digite ou selecione cliente...')}
                  className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all shadow-sm"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {dentistSearchText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDentistId('');
                      setDentistSearchText('');
                      setShowDentistDropdown(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>

              {showDentistDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDentistId('');
                      setDentistSearchText('');
                      setShowDentistDropdown(false);
                    }}
                    className={\`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-xs font-bold \${
                      !dentistId ? 'bg-teal-50/70 text-teal-800' : 'text-slate-600'
                    }\`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Users size={13} />
                    </div>
                    <span>{t('reports.allClientsDentists', 'Todos os Clientes / Dentistas')}</span>
                  </button>

                  {filteredDentistSuggestions.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                      {t('reports.noClientFound', 'Nenhum cliente ou dentista encontrado.')}
                    </div>
                  ) : (
                    filteredDentistSuggestions.map((d) => {
                      const isSelected = dentistId === d.id || dentistId === d.name;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setDentistId(d.id);
                            setDentistSearchText(d.name + (d.clinicName ? \` (\${d.clinicName})\` : ''));
                            setShowDentistDropdown(false);
                          }}
                          className={\`w-full text-left px-3.5 py-2.5 hover:bg-teal-50/50 flex items-center justify-between gap-2 cursor-pointer transition-colors \${
                            isSelected ? 'bg-teal-50 text-teal-900 font-black' : 'text-slate-700'
                          }\`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 font-black flex items-center justify-center text-xs shrink-0 border border-teal-100/80">
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                              {d.clinicName && (
                                <p className="text-[10px] text-slate-400 font-medium truncate">{d.clinicName}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={15} className="text-teal-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PATIENT / CASE CONTINUITY FILTER WITH SEARCH-AS-YOU-TYPE AND DROPDOWN */}
          {(dentistId || reportType === 'DETAILED_ORDERS' || patientFilter) && (
            <div className="space-y-1.5" ref={patientDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <UserIcon size={13} className="text-amber-600" /> {t('reports.patientCaseFilter', 'Paciente / Extrato')}
                </label>
                {patientFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientFilter('');
                      setPatientSearchText('');
                      setShowPatientDropdown(false);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    {t('common.clear', 'Limpar')}
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={patientSearchText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientSearchText(val);
                      setPatientFilter(val);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onClick={() => setShowPatientDropdown(true)}
                    placeholder={dentistId ? t('reports.searchPatientOfClient', 'Buscar paciente deste cliente...') : t('reports.searchPatientAll', 'Buscar paciente...')}
                    className={\`w-full pl-9 pr-8 py-3 bg-slate-50 border rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 outline-none text-sm transition-all shadow-sm \${
                      patientFilter ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20' : 'border-slate-200 focus:ring-teal-500'
                    }\`}
                  />
                  <UserIcon size={15} className={\`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none \${patientFilter ? 'text-amber-600' : 'text-slate-400'}\`} />
                  {patientSearchText ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilter('');
                        setPatientSearchText('');
                        setShowPatientDropdown(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {showPatientDropdown && (
                  <div className="absolute z-30 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilter('');
                        setPatientSearchText('');
                        setShowPatientDropdown(false);
                      }}
                      className={\`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-xs font-bold \${
                        !patientFilter ? 'bg-amber-50/70 text-amber-900' : 'text-slate-600'
                      }\`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Users size={13} />
                      </div>
                      <span>{t('reports.allPatients', 'Todos os Pacientes')}</span>
                    </button>

                    {filteredPatientSuggestions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                        {patientSearchText 
                          ? t('reports.useTypedPatientName', 'Filtrar por "\${name}"', { name: patientSearchText }) 
                          : t('reports.noPatientsFoundForClient', 'Nenhum paciente registrado para este cliente.')}
                      </div>
                    ) : (
                      filteredPatientSuggestions.map((p) => {
                        const isSelected = patientFilter.toLowerCase().trim() === p.name.toLowerCase().trim();
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setPatientFilter(p.name);
                              setPatientSearchText(p.name);
                              setShowPatientDropdown(false);
                            }}
                            className={\`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/50 flex items-center justify-between gap-2 cursor-pointer transition-colors \${
                              isSelected ? 'bg-amber-50 text-amber-900 font-black' : 'text-slate-700'
                            }\`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 font-black flex items-center justify-center text-xs shrink-0 border border-amber-200/60">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  {p.totalJobs} {p.totalJobs === 1 ? 'caso / OS' : 'casos / OSs'} • R$ {p.totalValue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={15} className="text-amber-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {reportType !== 'CLIENT_SUMMARY' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.collaborator', 'Colaborador')}</label>
                <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allCollaborators', 'Todos os Colaboradores')}</option>
                  {allUsers.filter(u => u.role !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.sector', 'Setor')}</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allSectors', 'Todos os Setores')}</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.orderStatus', 'Status do Pedido')}</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allStatuses', 'Todos os Status')}</option>
                  <option value="PENDING">{t('reports.pending', 'Pendente')}</option>
                  <option value="IN_PROGRESS">{t('reports.inProgress', 'Em Produção')}</option>
                  <option value="DELAYED">{t('reports.delayed', 'Atrasado')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.priority', 'Prioridade')}</label>
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allPriorities', 'Todas as Prioridades')}</option>
                  <option value="NORMAL">{t('reports.normalLow', 'Normal / Baixa')}</option>
                  <option value="URGENT">{t('reports.urgentVip', 'Urgente / VIP')}</option>
                </select>
              </div>

              {/* SERVICE CATEGORY FILTER */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Folder size={13} className="text-teal-600" /> Categoria de Serviço
                </label>
                <select 
                  value={selectedServiceCategory} 
                  onChange={(e) => {
                    setSelectedServiceCategory(e.target.value);
                    setJobTypeId('');
                  }} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                >
                  <option value="">Todas as Categorias</option>
                  {allCategoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.jobType', 'Tipo de Trabalho')}</label>
                <select value={jobTypeId} onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allTypes', 'Todos os Tipos')}</option>
                  {availableJobTypesForFilter.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                </select>
              </div>

              {selectedJobType && selectedJobType.variationGroups && selectedJobType.variationGroups.map(group => (
                <div key={group.id} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{group.name}</label>
                  <select 
                    value={variationFilters[group.id] || ''} 
                    onChange={(e) => setVariationFilters(prev => ({...prev, [group.id]: e.target.value}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  >
                    <option value="">{t('reports.anyVariation', 'Qualquer')}</option>
                    {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </div>
              ))}

              {reportType !== 'SERVICE_TYPES' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.groupBy', 'Agrupar Por')}</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="DATE">{t('reports.groupByDate', 'Data')}</option>
                    <option value="JOB_TYPE">{t('reports.groupByJobType', 'Tipo de Trabalho')}</option>
                    <option value="COLLABORATOR">{t('reports.groupByCollaborator', 'Colaborador')}</option>
                    <option value="LIST">{t('reports.groupByList', 'Lista Contínua')}</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>`;

const newFiltersBoxReplacement = `        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Base Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600" /> {t('reports.baseDate', 'Data Base')}
            </label>
            <select 
              value={dateType} 
              onChange={(e) => setDateType(e.target.value as any)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            >
              <option value="CREATED">{t('reports.entryDateCreation', 'Data de Entrada (Criação do Caso)')}</option>
              <option value="DUE">{t('reports.dueDateExpiration', 'Data de Entrega (Vencimento)')}</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.startDate', 'Data Inicial')}</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.endDate', 'Data Final')}</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
            />
          </div>

          {/* CLIENT / DENTIST FILTER WITH SEARCH-AS-YOU-TYPE AND DROPDOWN */}
          <div className="space-y-1.5" ref={dentistDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Stethoscope size={13} className="text-teal-600" /> {t('reports.clientDentist', 'Cliente / Dentista')}
              </label>
              {dentistId && (
                <button
                  type="button"
                  onClick={() => {
                    setDentistId('');
                    setDentistSearchText('');
                    setShowDentistDropdown(false);
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>

            <div className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={dentistSearchText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDentistSearchText(val);
                    setShowDentistDropdown(true);
                    if (!val.trim()) {
                      setDentistId('');
                    } else {
                      const exact = allClientOptions.find(d => 
                        d.name.toLowerCase() === val.trim().toLowerCase() ||
                        \`\${d.name} (\${d.clinicName})\`.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (exact) setDentistId(exact.id);
                    }
                  }}
                  onFocus={() => setShowDentistDropdown(true)}
                  onClick={() => setShowDentistDropdown(true)}
                  placeholder={t('reports.searchClientPlaceholderInput', 'Digite ou selecione cliente...')}
                  className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all shadow-sm"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {dentistSearchText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDentistId('');
                      setDentistSearchText('');
                      setShowDentistDropdown(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>

              {showDentistDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDentistId('');
                      setDentistSearchText('');
                      setShowDentistDropdown(false);
                    }}
                    className={\`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-xs font-bold \${
                      !dentistId ? 'bg-teal-50/70 text-teal-800' : 'text-slate-600'
                    }\`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Users size={13} />
                    </div>
                    <span>{t('reports.allClientsDentists', 'Todos os Clientes / Dentistas')}</span>
                  </button>

                  {filteredDentistSuggestions.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                      {t('reports.noClientFound', 'Nenhum cliente ou dentista encontrado.')}
                    </div>
                  ) : (
                    filteredDentistSuggestions.map((d) => {
                      const isSelected = dentistId === d.id || dentistId === d.name;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setDentistId(d.id);
                            setDentistSearchText(d.name + (d.clinicName ? \` (\${d.clinicName})\` : ''));
                            setShowDentistDropdown(false);
                          }}
                          className={\`w-full text-left px-3.5 py-2.5 hover:bg-teal-50/50 flex items-center justify-between gap-2 cursor-pointer transition-colors \${
                            isSelected ? 'bg-teal-50 text-teal-900 font-black' : 'text-slate-700'
                          }\`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 font-black flex items-center justify-center text-xs shrink-0 border border-teal-100/80">
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                              {d.clinicName && (
                                <p className="text-[10px] text-slate-400 font-medium truncate">{d.clinicName}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={15} className="text-teal-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ALWAYS VISIBLE: SERVICE CATEGORY FILTER */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Folder size={13} className="text-teal-600" /> Categoria de Serviço
              </label>
              {selectedServiceCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceCategory('');
                    setJobTypeId('');
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>
            <select 
              value={selectedServiceCategory} 
              onChange={(e) => {
                setSelectedServiceCategory(e.target.value);
                setJobTypeId('');
              }} 
              className={\`w-full p-3 border rounded-xl font-bold text-slate-700 focus:ring-2 outline-none text-sm transition-all shadow-sm \${
                selectedServiceCategory ? 'bg-teal-50/40 border-teal-300 ring-1 ring-teal-200' : 'bg-slate-50 border-slate-200 focus:ring-teal-500'
              }\`}
            >
              <option value="">Todas as Categorias</option>
              {allCategoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* ALWAYS VISIBLE: SERVICE TYPE FILTER (DYNAMICALLY FILTERED BY CATEGORY) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Package size={13} className="text-teal-600" /> Tipo de Serviço
              </label>
              {jobTypeId && (
                <button
                  type="button"
                  onClick={() => setJobTypeId('')}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  {t('common.clear', 'Limpar')}
                </button>
              )}
            </div>
            <select 
              value={jobTypeId} 
              onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} 
              className={\`w-full p-3 border rounded-xl font-bold text-slate-700 focus:ring-2 outline-none text-sm transition-all shadow-sm \${
                jobTypeId ? 'bg-teal-50/40 border-teal-300 ring-1 ring-teal-200' : 'bg-slate-50 border-slate-200 focus:ring-teal-500'
              }\`}
            >
              <option value="">{t('reports.allTypes', 'Todos os Tipos de Serviço')}</option>
              {availableJobTypesForFilter.map(jt => (
                <option key={jt.id} value={jt.id}>
                  {jt.name} {selectedServiceCategory ? '' : \`(\${jt.category || 'Geral'})\`}
                </option>
              ))}
            </select>
          </div>

          {/* PATIENT / CASE CONTINUITY FILTER */}
          {(dentistId || reportType === 'DETAILED_ORDERS' || patientFilter) && (
            <div className="space-y-1.5" ref={patientDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <UserIcon size={13} className="text-amber-600" /> {t('reports.patientCaseFilter', 'Paciente / Extrato')}
                </label>
                {patientFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setPatientFilter('');
                      setPatientSearchText('');
                      setShowPatientDropdown(false);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    {t('common.clear', 'Limpar')}
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={patientSearchText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientSearchText(val);
                      setPatientFilter(val);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onClick={() => setShowPatientDropdown(true)}
                    placeholder={dentistId ? t('reports.searchPatientOfClient', 'Buscar paciente deste cliente...') : t('reports.searchPatientAll', 'Buscar paciente...')}
                    className={\`w-full pl-9 pr-8 py-3 bg-slate-50 border rounded-xl font-bold text-slate-700 focus:bg-white focus:ring-2 outline-none text-sm transition-all shadow-sm \${
                      patientFilter ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20' : 'border-slate-200 focus:ring-teal-500'
                    }\`}
                  />
                  <UserIcon size={15} className={\`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none \${patientFilter ? 'text-amber-600' : 'text-slate-400'}\`} />
                  {patientSearchText ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilter('');
                        setPatientSearchText('');
                        setShowPatientDropdown(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {showPatientDropdown && (
                  <div className="absolute z-30 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilter('');
                        setPatientSearchText('');
                        setShowPatientDropdown(false);
                      }}
                      className={\`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-xs font-bold \${
                        !patientFilter ? 'bg-amber-50/70 text-amber-900' : 'text-slate-600'
                      }\`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Users size={13} />
                      </div>
                      <span>{t('reports.allPatients', 'Todos os Pacientes')}</span>
                    </button>

                    {filteredPatientSuggestions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-xs text-slate-400 font-medium">
                        {patientSearchText 
                          ? t('reports.useTypedPatientName', 'Filtrar por "\${name}"', { name: patientSearchText }) 
                          : t('reports.noPatientsFoundForClient', 'Nenhum paciente registrado para este cliente.')}
                      </div>
                    ) : (
                      filteredPatientSuggestions.map((p) => {
                        const isSelected = patientFilter.toLowerCase().trim() === p.name.toLowerCase().trim();
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setPatientFilter(p.name);
                              setPatientSearchText(p.name);
                              setShowPatientDropdown(false);
                            }}
                            className={\`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/50 flex items-center justify-between gap-2 cursor-pointer transition-colors \${
                              isSelected ? 'bg-amber-50 text-amber-900 font-black' : 'text-slate-700'
                            }\`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 font-black flex items-center justify-center text-xs shrink-0 border border-amber-200/60">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  {p.totalJobs} {p.totalJobs === 1 ? 'caso / OS' : 'casos / OSs'} • R$ {p.totalValue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={15} className="text-amber-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECONDARY / OPTIONAL PRODUCTION FILTERS */}
          {reportType !== 'CLIENT_SUMMARY' && reportType !== 'DEBTORS_CREDITORS' && reportType !== 'RECEIPTS' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.collaborator', 'Colaborador')}</label>
                <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allCollaborators', 'Todos os Colaboradores')}</option>
                  {allUsers.filter(u => u.role !== 'CLIENT').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.sector', 'Setor')}</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allSectors', 'Todos os Setores')}</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.orderStatus', 'Status do Pedido')}</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allStatuses', 'Todos os Status')}</option>
                  <option value="PENDING">{t('reports.pending', 'Pendente')}</option>
                  <option value="IN_PROGRESS">{t('reports.inProgress', 'Em Produção')}</option>
                  <option value="DELAYED">{t('reports.delayed', 'Atrasado')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.priority', 'Prioridade')}</label>
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm">
                  <option value="">{t('reports.allPriorities', 'Todas as Prioridades')}</option>
                  <option value="NORMAL">{t('reports.normalLow', 'Normal / Baixa')}</option>
                  <option value="URGENT">{t('reports.urgentVip', 'Urgente / VIP')}</option>
                </select>
              </div>

              {selectedJobType && selectedJobType.variationGroups && selectedJobType.variationGroups.map(group => (
                <div key={group.id} className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{group.name}</label>
                  <select 
                    value={variationFilters[group.id] || ''} 
                    onChange={(e) => setVariationFilters(prev => ({...prev, [group.id]: e.target.value}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                  >
                    <option value="">{t('reports.anyVariation', 'Qualquer')}</option>
                    {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </div>
              ))}

              {reportType !== 'SERVICE_TYPES' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('reports.groupBy', 'Agrupar Por')}</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="DATE">{t('reports.groupByDate', 'Data')}</option>
                    <option value="JOB_TYPE">{t('reports.groupByJobType', 'Tipo de Trabalho')}</option>
                    <option value="COLLABORATOR">{t('reports.groupByCollaborator', 'Colaborador')}</option>
                    <option value="LIST">{t('reports.groupByList', 'Lista Contínua')}</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>`;

if (content.includes(oldFiltersBoxTarget)) {
  content = content.replace(oldFiltersBoxTarget, newFiltersBoxReplacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully restructured Filters Box in Reports.tsx');
} else {
  console.log('oldFiltersBoxTarget not found!');
}
