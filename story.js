(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Story=api;})(typeof window==='object'?window:this,function(){
'use strict';
const beats={
 intro:{chapter:'序章',title:'最后一箱新书',time:'08:10',countdown:'距阅读节开始 30 分钟',cta:'接受配送任务',frames:[
  {role:'system',speaker:'校园调度终端',tag:'紧急任务',text:'最后一箱阅读节新书仍在收发室，目标是三十分钟内送到阅览室。'},
  {role:'teacher',speaker:'岚老师 · 阅读室',asset:'/assets/teacher-lan-lite.png',text:'我不能离开阅读室。请先检查路线和接收要求，书要送到、停好，还要安静提醒我。'},
  {role:'robot',speaker:'小达 · 配送机器人',asset:'/assets/robot-xiaoda-lite.png',text:'我可以被启动，但启动之后如何前进、转向和停止，还需要控制办法。'}]},
 manual:{chapter:'第一幕',title:'先由你来控制',time:'08:14',countdown:'距阅读节开始 26 分钟',cta:'接过图书车控制权',frames:[
  {role:'robot',speaker:'小达',asset:'/assets/robot-xiaoda-lite.png',text:'我的路线控制模块还在检查。请你先控制图书车，让我记下完成配送需要哪些判断。'},
  {role:'teacher',speaker:'岚老师',asset:'/assets/teacher-lan-lite.png',text:'通道有两个转角。别只看是否前进，还要观察车头、位置和停车时机。'}]},
 design:{chapter:'第二幕',title:'把经验交给小达',time:'08:22',countdown:'距阅读节开始 18 分钟',cta:'打开配送任务编辑器',frames:[
  {role:'system',speaker:'校园调度终端',tag:'系统检查完成',text:'小达已进入试运行状态。它只会按任务卡的顺序执行，不会自行补全缺少的动作。'},
  {role:'robot',speaker:'小达',asset:'/assets/robot-xiaoda-lite.png',text:'请把刚才的控制经验变成我能执行的任务。我会用运行结果告诉你方案是否完整。'},
  {role:'teacher',speaker:'岚老师',asset:'/assets/teacher-lan-lite.png',text:'阅读室已经开始安静阅读。别忘了设计一种合适的到站提醒方式。'}]},
 obstacle:{chapter:'第三幕',title:'走廊突发状况',time:'08:31',countdown:'距阅读节开始 9 分钟',cta:'进入突发状况控制台',frames:[
  {role:'system',speaker:'校园调度终端',tag:'通道变化',text:'保洁人员在走廊中临时放下了一个整理箱。目的地没变，但原来的配送条件已经改变。'},
  {role:'robot',speaker:'小达',asset:'/assets/robot-xiaoda-lite.png',text:'前方通道被占用。碰撞保护让我停了下来，但现有方案没有告诉我接下来怎样做。'},
  {role:'teacher',speaker:'岚老师',asset:'/assets/teacher-lan-lite.png',text:'请先预测原方案的结果，再给小达补充它真正能执行的遇障碍规则。'}]},
 program:{chapter:'第四幕',title:'写给小达的指令',time:'08:34',countdown:'控制模块调试中',cta:'打开指令编辑台',frames:[
  {role:'system',speaker:'校园调度终端',tag:'控制模块就绪',text:'小达需要一串能逐步执行的指令。先观察已有程序的结果，再修正方向、停止和提醒。'},
  {role:'robot',speaker:'小达',asset:'/assets/robot-xiaoda-lite.png',text:'请把前面亲自控制车的经验写成指令。我会逐条执行，并在出错的那一步停下来。'}]},
 assessment:{chapter:'第六环',title:'控制员独立验收',time:'08:37',countdown:'新配送任务待验收',cta:'开始20题情境考核',frames:[
  {role:'system',speaker:'校园调度终端',tag:'独立检验',text:'新的配送记录涉及启动、转向、停止、提醒和遇障碍。请完成20道情境题，留下自己的判断。'},
  {role:'teacher',speaker:'岚老师',asset:'/assets/teacher-lan-lite.png',text:'做错可以查看反馈并换一组情境重试。考核分数与闯关积分分开记录。'}]},
 robot:{chapter:'第七环',title:'设计我们的送书机器人',time:'08:40',countdown:'阅读节配送完成',cta:'开始设计作品',frames:[
  {role:'robot',speaker:'小达',asset:'/assets/robot-xiaoda-lite.png',text:'你已经体验过人工控制、任务规则和程序调试。现在请为下一次校园送书设计我的外形与三项自动功能。'},
  {role:'teacher',speaker:'岚老师',asset:'/assets/teacher-lan-lite.png',text:'写清每项功能怎样使用，以及内部是否有指令指挥。创意功能可以提出，但要标明哪些还没有经过仿真验证。'}]}
};
return {get:id=>beats[id]||null,stages:Object.keys(beats)};
});
