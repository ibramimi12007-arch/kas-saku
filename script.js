(function(){
  var KEY='kas-saku-v1', S={start:0,tx:[]}, type='out', armed=false;
  try{var raw=localStorage.getItem(KEY); if(raw){var p=JSON.parse(raw); if(p&&Array.isArray(p.tx)) S=p;}}catch(e){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
  var $=function(id){return document.getElementById(id)};
  var rp=function(n){return (n<0?'-':'')+'Rp'+Math.abs(n).toLocaleString('id-ID')};
  function num(v){var d=String(v).replace(/[^\d]/g,'');return d?parseInt(d,10):0}
  function balance(){var b=S.start||0;S.tx.forEach(function(t){b+=t.type==='in'?t.amt:-t.amt});return b}
  function fmtInput(el){var n=num(el.value);el.value=n?n.toLocaleString('id-ID'):''}
  var lastId=null;
  function toast(msg,kind,action){
    var box=$('toasts'),t=document.createElement('div');t.className='toast '+(kind||'');
    var sp=document.createElement('span');sp.textContent=msg;t.appendChild(sp);
    function close(){t.classList.add('bye');setTimeout(function(){t.remove()},200)}
    if(action){var b=document.createElement('button');b.type='button';b.textContent=action.label;b.onclick=function(){action.fn();close()};t.appendChild(b)}
    box.appendChild(t);
    while(box.children.length>3)box.firstChild.remove();
    setTimeout(close,action?6000:3500);
  }
  function ask(title,msg,yes,fn){
    var d=$('dlg');$('dlg-t').textContent=title;$('dlg-m').textContent=msg;$('dlg-yes').textContent=yes;
    $('dlg-no').onclick=function(){d.close()};
    $('dlg-yes').onclick=function(){d.close();fn()};
    if(d.showModal)d.showModal();else if(confirm(msg))fn();
  }

  function preview(){
    var cur=balance(),a=num($('amount').value);
    $('c-cur').textContent=rp(cur);
    $('c-fin').textContent=rp(type==='in'?cur+a:cur-a);
    $('c-sign').textContent=type==='in'?'+':'−';
  }
  function render(){
    var cur=balance(),tin=0,tout=0;
    S.tx.forEach(function(t){t.type==='in'?tin+=t.amt:tout+=t.amt});
    $('final').textContent=rp(cur);$('tin').textContent=rp(tin+(S.start||0));$('tout').textContent=rp(tout);
    var ul=$('list');ul.innerHTML='';
    if(!S.tx.length){var e=document.createElement('li');e.className='empty';e.textContent='No transactions yet. Add your first one on the left.';ul.appendChild(e)}
    S.tx.slice().reverse().forEach(function(t){
      var d=new Date(t.ts),li=document.createElement('li');li.className='tx'+(t.id===lastId?' fresh':'');
      var day=d.toLocaleDateString('id-ID',{weekday:'long'}),
          date=d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),
          time=d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      function add(cls,txt,tag){var x=document.createElement(tag||'div');x.className=cls;x.textContent=txt;li.appendChild(x);return x}
      add('why',t.reason);
      add('amt '+t.type,(t.type==='in'?'+':'-')+rp(t.amt));
      add('meta',day+', '+date+', '+time);
      add('meta r',rp(t.before)+' to '+rp(t.after));
      var b=add('del','Delete','button');b.type='button';
      b.onclick=function(){
        var i=S.tx.indexOf(t);S.tx.splice(i,1);save();render();preview();
        toast('Transaction deleted','warn',{label:'Undo',fn:function(){S.tx.splice(i,0,t);save();render();preview();toast('Transaction restored','success')}});
      };
      ul.appendChild(li);
    });
    $('start').placeholder=rp(S.start||0);
    renderReport();
  }
  function setType(t){
    type=t;$('t-out').setAttribute('aria-pressed',t==='out');$('t-in').setAttribute('aria-pressed',t==='in');
    $('reason-l').textContent=t==='out'?'Reason for spending':'Source of funds';
    $('reason').placeholder=t==='out'?'e.g. Lunch, bus fare, textbook':'e.g. Allowance, salary, refund';
    preview();
  }
  $('t-out').onclick=function(){setType('out')};
  $('t-in').onclick=function(){setType('in')};
  $('amount').addEventListener('input',function(){fmtInput(this);preview()});
  $('start').addEventListener('input',function(){fmtInput(this)});
  $('save').onclick=function(){
    var a=num($('amount').value),r=$('reason').value.trim(),err=$('err');err.textContent='';
    if(!a){err.textContent='Enter an amount greater than zero.';toast('Enter an amount first','error');$('amount').focus();return}
    if(!r){err.textContent=type==='out'?'Add a reason for this expense.':'Add the source of these funds.';toast(type==='out'?'Add a reason for this expense':'Add the source of these funds','error');$('reason').focus();return}
    var cur=balance();
    S.tx.push({id:Date.now()+''+Math.random().toString(36).slice(2,6),type:type,amt:a,reason:r,ts:Date.now(),before:cur,after:type==='in'?cur+a:cur-a});
    lastId=S.tx[S.tx.length-1].id;
    save();$('amount').value='';$('reason').value='';render();preview();
    var fin=balance();
    toast((type==='in'?'Added ':'Spent ')+rp(a)+' - '+r,'success');
    if(fin<0)setTimeout(function(){toast('Heads up: your balance is now negative','warn')},300);
    else if(type==='out'&&cur>0&&fin<cur*0.1)setTimeout(function(){toast('Low balance: less than 10% of your funds left','warn')},300);
  };
  $('setstart').onclick=function(){
    var v=num($('start').value);S.start=v;save();$('start').value='';render();preview();toast('Starting balance set to '+rp(v),'success');
  };
  $('reset').onclick=function(){
    ask('Erase all history?','This deletes every transaction and resets the starting balance. It cannot be undone.','Erase',function(){
      S={start:0,tx:[]};lastId=null;save();render();preview();toast('All history erased','success');
    });
  };

  /* ---- reports: daily / weekly / monthly / yearly ---- */
  var rpP='week',rpO=0;
  function fmtD(d,o){return d.toLocaleDateString('id-ID',o)}
  function range(p,o){
    var n=new Date(),Y=n.getFullYear(),M=n.getMonth(),D=n.getDate(),s,e;
    if(p==='day'){s=new Date(Y,M,D+o);e=new Date(Y,M,D+o+1)}
    else if(p==='week'){var b=new Date(Y,M,D+o*7),w=(b.getDay()+6)%7;s=new Date(b.getFullYear(),b.getMonth(),b.getDate()-w);e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7)}
    else if(p==='month'){s=new Date(Y,M+o,1);e=new Date(Y,M+o+1,1)}
    else{s=new Date(Y+o,0,1);e=new Date(Y+o+1,0,1)}
    return {s:s,e:e};
  }
  function renderReport(){
    var r=range(rpP,rpO),s=r.s,e=r.e,st=s.getTime(),et=e.getTime(),n,idx,lab;
    document.querySelectorAll('.ptab').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.p===rpP)});
    $('next').disabled=rpO>=0;
    var last=new Date(et-1);
    $('plabel').textContent=rpP==='day'?fmtD(s,{weekday:'long',day:'numeric',month:'long',year:'numeric'})
      :rpP==='week'?fmtD(s,{day:'numeric',month:'short'})+' - '+fmtD(last,{day:'numeric',month:'short',year:'numeric'})
      :rpP==='month'?fmtD(s,{month:'long',year:'numeric'}):String(s.getFullYear());
    if(rpP==='day'){n=24;idx=function(d){return d.getHours()};lab=function(i){return i%6===0?(i<10?'0':'')+i:''}}
    else if(rpP==='week'){n=7;idx=function(d){return (d.getDay()+6)%7};lab=function(i){return fmtD(new Date(s.getFullYear(),s.getMonth(),s.getDate()+i),{weekday:'short'})}}
    else if(rpP==='month'){n=Math.round((et-st)/864e5);idx=function(d){return d.getDate()-1};lab=function(i){return (i===0||(i+1)%5===0)?String(i+1):''}}
    else{n=12;idx=function(d){return d.getMonth()};lab=function(i){return fmtD(new Date(s.getFullYear(),i,1),{month:'short'})}}
    var inn=[],out=[],i,ti=0,to=0,ex=[];
    for(i=0;i<n;i++){inn.push(0);out.push(0)}
    S.tx.forEach(function(t){
      if(t.ts<st||t.ts>=et)return;
      var k=idx(new Date(t.ts));
      if(t.type==='in'){inn[k]+=t.amt;ti+=t.amt}else{out[k]+=t.amt;to+=t.amt;ex.push(t)}
    });
    $('r-in').textContent=rp(ti);$('r-out').textContent=rp(to);
    var net=ti-to,nb=$('r-net');nb.textContent=(net>0?'+':'')+rp(net);nb.style.color=net<0?'var(--out)':net>0?'var(--in)':'';
    var ch=$('chart');ch.innerHTML='';
    if(!ti&&!to){var em=document.createElement('div');em.className='empty meta';em.style.textAlign='center';em.textContent='No transactions in this period.';ch.appendChild(em)}
    else{
      var mx=Math.max.apply(null,inn.concat(out,[1]));
      for(i=0;i<n;i++){
        var col=document.createElement('div'),bars=document.createElement('div'),a=document.createElement('span'),b=document.createElement('span'),l=document.createElement('div');
        col.className='col';bars.className='bars';a.className='bi';b.className='bo';l.className='lab';
        a.style.height=(inn[i]/mx*100)+'%';b.style.height=(out[i]/mx*100)+'%';
        col.title=lab(i)+' | In '+rp(inn[i])+' | Spent '+rp(out[i]);
        l.textContent=lab(i);
        bars.appendChild(a);bars.appendChild(b);col.appendChild(bars);col.appendChild(l);ch.appendChild(col);
      }
    }
    var ol=$('top');ol.innerHTML='';
    ex.sort(function(x,y){return y.amt-x.amt});
    if(!ex.length){var q=document.createElement('li');q.className='meta';q.textContent='No expenses in this period.';ol.appendChild(q)}
    ex.slice(0,5).forEach(function(t){
      var li=document.createElement('li'),hd=document.createElement('div'),nm=document.createElement('span'),am=document.createElement('span'),m=document.createElement('div'),bar=document.createElement('div'),f=document.createElement('i'),d=new Date(t.ts);
      hd.className='hd';nm.className='nm';nm.textContent=t.reason;am.className='am';am.textContent=rp(t.amt);
      m.className='meta';m.textContent=fmtD(d,{weekday:'long',day:'numeric',month:'long'})+', '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false});
      bar.className='bar';f.style.width=(t.amt/ex[0].amt*100)+'%';bar.appendChild(f);
      hd.appendChild(nm);hd.appendChild(am);li.appendChild(hd);li.appendChild(m);li.appendChild(bar);ol.appendChild(li);
    });
  }
  document.querySelectorAll('.ptab').forEach(function(b){b.onclick=function(){rpP=this.dataset.p;rpO=0;renderReport()}});
  $('prev').onclick=function(){rpO--;renderReport()};
  $('next').onclick=function(){if(rpO<0){rpO++;renderReport()}};
  render();preview();
})();

if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
