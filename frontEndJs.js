/*{"dst":"./public/src.js","src":"frontEndJs.js","app":"yattaPrint","babel":true}*/
var w = 600,
  sy = 450,
  stepY = 50,
  sx = 300,stepX=20;
var tagId = '';
var logo = document.getElementById("logo");
var canvas = document.getElementById('canvas');
function formatTime(t){
  t=Math.floor(t/1000);
  var ret='',tmp='';
  tmp=t%60;
  t=Math.floor(t/60);
  ret=':'+('0'+tmp).split('').slice(-2).join('');
  tmp=t%60;
  t=Math.floor(t/60);
  ret=('0'+tmp).split('').slice(-2).join('')+ret;
  if(t>0)ret=t+':'+ret;
  return ret;
}
function fillTextRight(ctx, txt, x, y) {
  ctx.fillText(txt, x - ctx.measureText(txt).width, y);
}
$(function () {
  $('#canvas')
  $('html body').on('keyup', function (e) {
    if (e.keyCode != 13) {
      if (e.key.length == 1) {
        tagId += e.key;
      }
    } else {
      console.log(tagId);
      //tagId=tagId.slice(14,17)*1;
      $.get('/result/' + tagId, function (data) {
        var ctx = canvas.getContext('2d');
        data.bibNo = data.bibNo.trim();
        console.log(data);
        ctx.beginPath();
        ctx.rect(0, 0, 800, 800);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.drawImage(logo, 150, -35, 300, 300);
        ctx.fillStyle = "black";
        //draw name
        var fontSize = 40;
        ctx.font = fontSize + "px Tahoma";
        while (ctx.measureText(data.name).width > w) {
          fontSize--;
          ctx.font = fontSize + "px Tahoma";
        }
        ctx.fillText(data.name, (w - ctx.measureText(data.name).width) / 2, 350);
        //draw bibNo
        ctx.font = "55px Tahoma";
        ctx.fillText(data.bibNo, (w - ctx.measureText(data.bibNo).width) / 2, 290);
        //draw legend
        ctx.font = "30px Tahoma";
        fillTextRight(ctx, 'Gun Time  :', sx, sy + stepY * 0);
        fillTextRight(ctx, 'Chip Time  :', sx, sy + stepY * 1);
        fillTextRight(ctx, 'Cat Place  :', sx, sy + stepY * 2);
        fillTextRight(ctx, 'Gender Place  :', sx, sy + stepY * 3);
        ctx.fillText(formatTime(data.gunTime),sx+stepX, sy + stepY * 0);
        ctx.fillText(formatTime(data.chipTime),sx+stepX, sy + stepY * 1);
        ctx.fillText(data.catPlace,sx+stepX, sy + stepY * 2);
        ctx.fillText(data.genderPlace,sx+stepX, sy + stepY * 3);
        var res = canvas.toDataURL("image/png");
        // $.post('/print', {
        //   img: res
        // }, function (data) {
        //   console.log(data);
        // });
      });
      tagId = '';
    }
  });
});
