/* 纯函数策略示例；来源 S2 §2.3 / S3 §3.4。浏览器示例不代替服务端鉴权。 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SeazenRules=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const editStatuses=['unsubmitted','returned','voided'];
  const approvalStatuses=['approving','returned','voided','rejected','approved'];
  const labels={unsubmitted:'未提交',approving:'审批中',returned:'审批退回',voided:'审批作废',rejected:'审批拒绝',approved:'已审批'};
  function result(visible,enabled,reason=''){return {visible,enabled,reason};}
  function evaluate(action,context={}){
    const {permissions=[],organization='group',selection=[],busy=false,submitStatuses=null,exportSensitive=false,allowSensitiveExport=false}=context;
    if(!permissions.includes(action))return result(false,false,'无此操作权限');
    if(busy)return result(true,false,'正在处理，请稍候');
    if(action==='create')return result(true,organization==='project',organization==='project'?'':'请选择项目层级组织');
    if(action==='export')return result(true,!exportSensitive||allowSensitiveExport,exportSensitive&&!allowSensitiveExport?'敏感字段导出尚未授权':'');
    if(!selection.length)return result(true,false,'请先选择一条单据');
    if(selection.some(x=>x.deleted))return result(true,false,'所选单据已逻辑删除');
    if(selection.length!==1)return result(true,false,'此示例仅支持单条操作；批量策略待业务确认');
    const status=selection[0].status;
    if(action==='view')return result(true,true);
    if(action==='edit')return result(true,editStatuses.includes(status),editStatuses.includes(status)?'':'仅未提交、审批退回、审批作废可修改');
    if(action==='delete')return result(true,status==='unsubmitted',status==='unsubmitted'?'':'仅未提交单据可逻辑删除');
    if(action==='viewApproval')return result(true,approvalStatuses.includes(status),approvalStatuses.includes(status)?'':'当前单据尚无审批记录');
    if(action==='submit'){
      if(!Array.isArray(submitStatuses))return result(true,false,'提交审批状态规则待产品确认，当前不启用');
      return result(true,submitStatuses.includes(status),submitStatuses.includes(status)?'':'当前状态不可提交审批');
    }
    return result(true,false,'未配置该操作策略');
  }
  function logicalDelete(record){if(!record||record.status!=='unsubmitted'||record.deleted)throw Error('仅允许逻辑删除未提交单据');return {...record,deleted:true};}
  function formatNumber(value,{integer=false}={}){if(value===null||value===undefined||value==='')return '';if(!Number.isFinite(Number(value)))return '—';return new Intl.NumberFormat('en-US',{minimumFractionDigits:integer?0:2,maximumFractionDigits:integer?0:2}).format(Number(value));}
  function formatDate(value){if(!value)return '';const m=String(value).match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);if(!m)return '—';const y=+m[1],mo=+m[2],d=+m[3];const date=new Date(Date.UTC(y,mo-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||date.getUTCDate()!==d)return '—';return `${m[1]}/${m[2]}/${m[3]}`;}
  return {evaluate,logicalDelete,formatNumber,formatDate,labels,editStatuses,approvalStatuses};
});
