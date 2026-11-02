insert into engagements(id,name,currency,period_start,period_end,owner,due_date) values
 ('10000000-0000-4000-8000-000000000001','Harbour Wholesale FY26','NZD','2026-04-01','2027-03-31','Aroha Mason',current_date-3),
 ('10000000-0000-4000-8000-000000000002','Harbour Services FY26','AUD','2026-07-01','2027-06-30','Leo Chen',current_date+14)
 on conflict do nothing;
insert into populations(id,engagement_id,name,source_file,source_sha256,expected_count,expected_net,imported_by,row_count) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','October payables','fictional-demo.csv',repeat('a',64),8,24990,'Aroha Mason',8),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','October journals','fictional-journals.csv',repeat('b',64),null,null,'Leo Chen',4)
 on conflict do nothing;
insert into entries(population_id,row_no,record_id,journal,invoice,vendor,account,entry_date,amount,entered_by,description,raw)
select '20000000-0000-4000-8000-000000000001',n,ref,j,inv,vendor,acc,day::date,amount,who,descr,'{}'::jsonb from (values
 (1,'1001','AP-01','INV-104','Harbour Packaging','5000','2026-10-02',1250.00,'Mia','Cartons'),
 (2,'1002','AP-02','INV-104','Harbour Packaging','5000','2026-10-03',1250.00,'Mia','Repeated invoice reference'),
 (3,'1004','AP-03','INV-208','Southern Freight','5100','2026-10-04',4990.00,'Noah','Freight run'),
 (4,'1005','AP-04','INV-209','Southern Freight','5100','2026-10-05',5000.00,'Noah','Round amount'),
 (5,'1006','AP-05','INV-301','Coastal Supply','5000','2026-10-06',12000.00,'','Missing operator'),
 (6,'1007','AP-06','CR-301','Coastal Supply','5000','2026-10-07',-500.00,'Mia','Credit note'),
 (7,'1008','AP-07','','','5000','2026-10-08',1000.00,'Mia','Missing invoice and vendor'),
 (8,'1010','AP-08','INV-888','Northern Goods','5000','2026-03-31',0.00,'Mia','Outside period')
) as x(n,ref,j,inv,vendor,acc,day,amount,who,descr) on conflict do nothing;
insert into entries(population_id,row_no,record_id,journal,account,entry_date,amount,entered_by,description,raw)
select '20000000-0000-4000-8000-000000000002',n,n::text,j,acc,'2026-10-10',amt,'Leo','Fictional journal','{}'::jsonb from (values
 (1,'J-01','1000',2000.00),(2,'J-01','4000',-2000.00),(3,'J-02','1000',750.00),(4,'J-02','4000',-700.00)
) as x(n,j,acc,amt) on conflict do nothing;
insert into test_runs(id,population_id,test_name,parameters,results,prepared_by,purpose,source_sha256,result_sha256,engine_version,due_date,created_at)
 values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','demo-follow-up','{}','[]','Aroha Mason','Fictional overdue review example',repeat('a',64),repeat('c',64),'demo',current_date-7,now()-interval '12 days') on conflict do nothing;
