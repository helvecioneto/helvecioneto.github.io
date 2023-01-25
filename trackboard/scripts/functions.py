import sys
import glob
import pathlib
import pandas as pd
import geopandas as gpd
import numpy as np
import re
from pytimeparse.timeparse import timeparse
pyfortrack_dir = '/home/helvecioneto/pyfortrack/'
sys.path.append(pyfortrack_dir)

from pyfortrack.read_data import rad_example, jaxa, jaxa2, goes16, goes13, rad_example, vlfsensor, goamazon, noaa, mapbiomas, kde_flash, glm, censipan, goes16mmh

def get_latest_timestamp(path):
    files = sorted(glob.glob(path + '**/geometry/boundary/*.geojson', recursive=True))
    max_timestamp = max(files, key=pathlib.Path)
    max_timestamp = max_timestamp.split('/')[-1][:-8]
    timestamp = pd.to_datetime(max_timestamp, format='%Y%m%d_%H%M00', errors='coerce', utc=True)
    return timestamp

def get_geotrack_paths(timestamp, path):
    boundary_path = path + timestamp.strftime('geometry/boundary/%Y%m%d_%H%M00.geojson')
    vector_field_path = path + timestamp.strftime('geometry/vector_field/%Y%m%d_%H%M00.geojson')
    trajectory_path = path + timestamp.strftime('geometry/trajectory/%Y%m%d_%H%M00.geojson')
    return boundary_path, vector_field_path, trajectory_path

def get_geofrcst_paths(timestamp, time, time_delta, path, ):
    time_delta = pd.to_timedelta(timeparse(time_delta), unit='s')
    delta_path = timestamp + (time_delta * time)
    boundary_path = path + timestamp.strftime('%Y%m%d_%H%M00/geometry/boundary/') + delta_path.strftime('%Y%m%d_%H%M00.geojson')
    vector_field_path = path + timestamp.strftime('%Y%m%d_%H%M00/geometry/vector_field/') + delta_path.strftime('%Y%m%d_%H%M00.geojson')
    trajectory_path = path + timestamp.strftime('%Y%m%d_%H%M00/geometry/trajectory/') + delta_path.strftime('%Y%m%d_%H%M00.geojson')
    return boundary_path, vector_field_path, trajectory_path

def get_data_paths(timestamp, data_path, data_pattern):
    # Remove extra % from data_pattern
    data_pattern = data_pattern.replace('%%', '%')
    # Using re replace %YYYY, %mm, %dd, %HH, %MM, %SS with timestamp values
    data_pattern = re.sub('%YYYY|%YY', timestamp.strftime('%Y'), data_pattern)
    data_pattern = re.sub('%mm', timestamp.strftime('%m'), data_pattern)
    data_pattern = re.sub('%dd', timestamp.strftime('%d'), data_pattern)
    data_pattern = re.sub('%HH', timestamp.strftime('%H'), data_pattern)
    data_pattern = re.sub('%MM', timestamp.strftime('%M'), data_pattern)
    data_pattern = re.sub('%SS', timestamp.strftime('%S'), data_pattern)
    return data_path + data_pattern

def read_geoframe(path):
    try:
        geoframe = gpd.read_file(path)
    except:
        geoframe = gpd.GeoDataFrame()
    return geoframe

def read_data(data_name):
    # Import read_data function according to data_name
    try:
        if data_name == "rad_example":
            read_file = rad_example.read_file
        elif data_name == "goamazon":
            read_file = goamazon.read_file
        elif data_name == "goes13":
            read_file = goes13.read_file
        elif data_name == "goes16":
            read_file = goes16.read_file
        elif data_name == "jaxa":
            read_file = jaxa.read_file
        elif data_name == "gsmap":
            read_file = jaxa2.read_file
        elif data_name == "vlfsensor":
            read_file = vlfsensor.read_file
        elif data_name == "noaa":
            read_file = noaa.read_file
        elif data_name == "kde_flash":
            read_file = kde_flash.read_file
        elif data_name == "glm":
            read_file = glm.read_file
        elif data_name == "censipan":
            read_file = censipan.read_file
        elif data_name == "goes16mmh":
            read_file = goes16mmh.read_file
        else:
            raise ValueError("data_name not found")
        return read_file
    except:
        # empty numpy array
        return lambda x: np.array([])