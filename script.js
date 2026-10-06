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
  render();preview();
})();

if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
