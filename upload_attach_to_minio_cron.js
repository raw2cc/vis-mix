import cron from 'node-cron';
import { exec } from 'child_process';

cron.schedule('0 4 * * *', () => {
  console.log('开始执行 upload_attach_to_minio.js');
  exec('node upload_attach_to_minio.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`执行出错: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
});

console.log('定时任务已启动，每天凌晨4点执行 upload_attach_to_minio.js');

