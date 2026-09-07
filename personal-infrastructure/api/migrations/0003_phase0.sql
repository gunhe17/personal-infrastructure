-- deployment: 롤백이 감지를 다시 돌리지 않도록 컨테이너 포트를 박제한다
alter table deployment add column container_port integer;
