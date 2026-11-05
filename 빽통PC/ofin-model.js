(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OfinModel=factory();})(typeof window==='undefined'?globalThis:window,()=>{
  const date = value => {const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function seed(now=new Date()) {
    const today=date(now),due=date(new Date(now.getFullYear(),now.getMonth(),now.getDate()+63));
    const old=date(new Date(now.getFullYear(),now.getMonth()-1,26));
    const item=(id,amount,fare,insurance,up,down,cargo,status='pending',processedAt='')=>({id,orderNumber:`${today.replaceAll('-','')}1786${id}`,name:'홍길동1',car:'제주90바1417',
      applied:today,settlement:due,upDate:today,downDate:today,up,down,cargo,amount,fare,insurance,status,processedAt});
    return {schema:1,loggedIn:false,availableLimit:299485070,business:{name:'교육용 화물',representative:'홍길동',number:'123-45-67890',phone:'010-0000-0000'},items:[
      item('05',339640,341000,1360,'경북 경산시 진량읍','경북 안동시','오후상/자재/비무관'),
      item('03',514930,517000,2070,'전남광주 장흥군 장흥읍','인천 남동구 논현동','폐차2대'),
      item('02',339640,341000,1360,'경북 경산시 진량읍','경북 안동시','오후상/자재/비무관','rejected',today+'T09:00:00'),
      item('01',438240,440000,1760,'대구 달서구 도원동','울산 울주군 범서읍','왕복 테스트','rejected',old+'T09:00:00')
    ]};
  }
  function decide(state,ids,decision,now=new Date()) {
    if(!['approved','rejected'].includes(decision))throw Error('잘못된 처리 구분입니다.');
    const chosen=new Set(ids);if(!chosen.size)throw Error('신청건을 선택해 주세요.');
    const items=state.items.filter(x=>chosen.has(x.id));
    if(items.length!==chosen.size||items.some(x=>x.status!=='pending'))throw Error('이미 처리되었거나 없는 신청건입니다.');
    return {...state,items:state.items.map(x=>chosen.has(x.id)?{...x,status:decision,processedAt:new Date(now).toISOString(),settlementStatus:decision==='approved'?'scheduled':null}:x)};
  }
  function summary(state,now=new Date()) {
    const month=date(now).slice(0,7),pending=state.items.filter(x=>x.status==='pending');
    const processed=state.items.filter(x=>x.status!=='pending'&&date(x.processedAt).startsWith(month));
    return {pendingCount:pending.length,pendingAmount:pending.reduce((s,x)=>s+x.amount,0),monthCount:processed.length,monthAmount:processed.reduce((s,x)=>s+x.amount,0)};
  }
  function filter(state,{approved=true,rejected=true,from='',to='',status='all'}={}) {
    return state.items.filter(x=>x.status!=='pending'&&(x.status==='approved'?approved:rejected))
      .filter(x=>(!from||x.settlement>=from)&&(!to||x.settlement<=to))
      .filter(x=>status==='all'||(x.status==='approved'&&x.settlementStatus===status))
      .sort((a,b)=>new Date(b.processedAt)-new Date(a.processedAt));
  }
  return {date,seed,decide,summary,filter};
});
